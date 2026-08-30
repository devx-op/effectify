#!/usr/bin/env bash
set -euo pipefail

: "${EXPECTED_SHA:?EXPECTED_SHA is required}"
[[ "$EXPECTED_SHA" =~ ^[0-9a-f]{40}$ ]] || { echo "::error::FINALIZE requires full lowercase expected SHA"; exit 1; }
MAX_NPM_READS=6
NPM_READ_DELAY=${NPM_READ_DELAY:-10}
WORK=$(mktemp -d)
RECORDS="$WORK/records"
printf '%s\n' \
  '@effectify/hatchet|packages/hatchet/package.json|0.1.0' \
  '@effectify/node-better-auth|packages/node/better-auth/package.json|0.5.12' \
  '@effectify/prisma|packages/prisma/package.json|1.1.13' \
  '@effectify/react-query|packages/react/query/package.json|1.0.0' \
  '@effectify/react-router|packages/react/router/package.json|0.6.0' \
  '@effectify/react-router-better-auth|packages/react/router-better-auth/package.json|0.5.12' \
  '@effectify/solid-query|packages/solid/query/package.json|0.5.13' > "$RECORDS"

fail() { echo "::error::$*" >&2; exit 1; }
manifest_ok() {
  node -e 'const fs=require("node:fs");const [path,name,version]=process.argv.slice(1);let v;try{v=JSON.parse(fs.readFileSync(path,"utf8"))}catch{process.exit(2)}if(!v||typeof v!=="object"||Array.isArray(v)||typeof v.name!=="string"||typeof v.version!=="string"||v.name!==name||v.version!==version){process.stdout.write(`actual=${JSON.stringify({name:typeof v?.name==="string"?v.name:null,version:typeof v?.version==="string"?v.version:null})} expected=${JSON.stringify({name,version})}`);process.exit(1)}' "$1" "$2" "$3"
}
npm_state() {
  local name=$1 version=$2 versions latest
  versions=$(npm view "$name" versions --json) || return 2
  latest=$(npm view "$name" dist-tags.latest --json) || return 2
  printf '%s\n%s' "$versions" "$latest" | node -e 'const fs=require("node:fs"),[version]=process.argv.slice(1),lines=fs.readFileSync(0,"utf8").split("\n"),vs=JSON.parse(lines.shift()),latest=JSON.parse(lines.join("\n"));if(!(typeof vs==="string"||Array.isArray(vs)&&vs.every(x=>typeof x==="string"))||typeof latest!=="string")process.exit(2);const present=Array.isArray(vs)?vs.includes(version):vs===version;process.exit(present?(latest===version?0:3):1)' "$version"
}
read_npm_bounded() {
  local name=$1 version=$2 attempt status
  for attempt in $(seq 1 "$MAX_NPM_READS"); do
    set +e; npm_state "$name" "$version"; status=$?; set -e
    [ "$status" = 0 ] && return 0
    [ "$status" = 1 ] && return 1
    [ "$attempt" = "$MAX_NPM_READS" ] || sleep "$NPM_READ_DELAY"
  done
  return "$status"
}
verify_tag() {
  local tag=$1 remote direct peeled sha
  remote=$(git ls-remote --tags origin "refs/tags/$tag" "refs/tags/$tag^{}") || fail "unknown remote tag state for $tag"
  [ -n "$remote" ] || return 1
  direct=$(printf '%s\n' "$remote" | awk -v r="refs/tags/$tag" '$2==r{n++}END{print n+0}')
  peeled=$(printf '%s\n' "$remote" | awk -v r="refs/tags/$tag^{}" '$2==r{n++}END{print n+0}')
  sha=$(printf '%s\n' "$remote" | awk -v r="refs/tags/$tag^{}" '$2==r{print $1}')
  [ "$direct" = 1 ] && [ "$peeled" = 1 ] && [ "$sha" = "$EXPECTED_SHA" ] || fail "divergent, partial, or lightweight tag $tag"
}
verify_release() {
  local tag=$1 value status err="$WORK/gh-error"
  set +e; value=$(gh release view "$tag" --json tagName,isDraft,isPrerelease 2>"$err"); status=$?; set -e
  if [ "$status" = 0 ]; then
    printf '%s' "$value" | node -e 'const fs=require("node:fs"),tag=process.argv[1],v=JSON.parse(fs.readFileSync(0,"utf8"));if(!v||typeof v!=="object"||Array.isArray(v)||v.tagName!==tag||v.isDraft!==false||v.isPrerelease!==false)process.exit(1)' "$tag" || fail "divergent, draft, or prerelease GitHub Release $tag"
    return 0
  fi
  [ "$status" = 1 ] && grep -Fqi 'release not found' "$err" && return 1
  fail "unknown GitHub Release state for $tag"
}

git fetch origin master:refs/remotes/origin/master --no-tags
[ "$(git rev-parse HEAD)" = "$EXPECTED_SHA" ] || fail "HEAD does not match expected SHA"
[ "$(git rev-parse origin/master)" = "$EXPECTED_SHA" ] || fail "origin/master does not match expected SHA"
git config user.name 'github-actions[bot]'
git config user.email 'github-actions[bot]@users.noreply.github.com'
: > "$WORK/missing-projects"; : > "$WORK/missing-tags"; : > "$WORK/missing-releases"
while IFS='|' read -r NAME MANIFEST_PATH VERSION; do
  DETAIL=$(manifest_ok "$MANIFEST_PATH" "$NAME" "$VERSION") || { STATUS=$?; [ "$STATUS" = 1 ] && fail "merged manifest identity mismatch for $NAME: $DETAIL"; fail "merged manifest execution or parse failed for $NAME"; }
  if read_npm_bounded "$NAME" "$VERSION"; then STATUS=0; else STATUS=$?; fi
  case $STATUS in 0) ;; 1) printf '%s\n' "$NAME" >> "$WORK/missing-projects" ;; 3) fail "permanent latest divergence for $NAME" ;; *) fail "npm state unreadable after $MAX_NPM_READS attempts for $NAME" ;; esac
  TAG="$NAME@$VERSION"
  verify_tag "$TAG" || printf '%s\n' "$TAG" >> "$WORK/missing-tags"
  verify_release "$TAG" || printf '%s\n' "$TAG" >> "$WORK/missing-releases"
done < "$RECORDS"

TAG_REFS=()
while IFS= read -r TAG; do [ -n "$TAG" ] || continue; git show-ref --verify --quiet "refs/tags/$TAG" && fail "local tag collision $TAG"; git tag -a "$TAG" "$EXPECTED_SHA" -m "$TAG"; TAG_REFS+=("refs/tags/$TAG:refs/tags/$TAG"); done < "$WORK/missing-tags"
if [ ${#TAG_REFS[@]} -gt 0 ]; then git push --atomic origin "${TAG_REFS[@]}" || echo "::warning::atomic tag push failed; post-verifying remote state" >&2; fi
while IFS='|' read -r NAME _ VERSION; do TAG="$NAME@$VERSION"; verify_tag "$TAG" || fail "remote tag postverification failed for $TAG"; done < "$RECORDS"
while IFS= read -r TAG; do [ -n "$TAG" ] || continue; gh release create "$TAG" --verify-tag --generate-notes || fail "GitHub Release creation failed for $TAG"; done < "$WORK/missing-releases"
while IFS='|' read -r NAME _ VERSION; do verify_release "$NAME@$VERSION" || fail "GitHub Release postverification failed for $NAME@$VERSION"; done < "$RECORDS"
MISSING_PROJECTS=$(paste -sd, "$WORK/missing-projects")
if [ -n "$MISSING_PROJECTS" ]; then pnpm nx release publish "--projects=$MISSING_PROJECTS"; fi
for ATTEMPT in $(seq 1 "$MAX_NPM_READS"); do
  REMAINING=0
  DIVERGENT=""
  while IFS='|' read -r NAME _ VERSION; do
    set +e; npm_state "$NAME" "$VERSION"; STATUS=$?; set -e
    if [ "$STATUS" != 0 ]; then
      [ "$STATUS" = 3 ] && DIVERGENT=$NAME
      REMAINING=$((REMAINING+1))
    fi
  done < "$RECORDS"
  [ "$REMAINING" = 0 ] && exit 0
  if [ "$ATTEMPT" = "$MAX_NPM_READS" ]; then
    [ -n "$DIVERGENT" ] && fail "permanent latest divergence for $DIVERGENT"
    fail "npm did not converge: $REMAINING"
  fi
  sleep "$NPM_READ_DELAY"
done
