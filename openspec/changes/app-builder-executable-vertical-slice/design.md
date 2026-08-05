# Design: App Builder Executable Vertical Slice

## Technical Approach

Preserve public `DurableFileSystemService` and `RunExecutor.execute`. Select exactly four Koffi 3.1.4 profiles; Linux without `process.report.getReport().header.glibcVersionRuntime` fails.

## Architecture Decisions

| Choice                   | Rationale                                                                                                   |
| ------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Koffi 3.1.4              | Prebuilds preserve in-process FDs; no subprocess protocol.                                                  |
| Explicit profiles        | Headerless FFI requires size checks and offline fixtures.                                                   |
| Exchange-to-sentinel CAS | `RENAME_SWAP/EXCHANGE` preserves name occupancy while detached content is compared, committed, or restored. |

Evidence: [Koffi](https://koffi.dev/load), [structs](https://koffi.dev/composites), [prebuilds](https://registry.npmjs.org/koffi/latest), [Apple](https://github.com/apple-oss-distributions/xnu/tree/main/bsd/sys), [glibc](https://github.com/bminor/glibc/tree/master/sysdeps/unix/sysv/linux), [errno](https://github.com/torvalds/linux/tree/master/include/uapi/asm-generic), [Linux](https://man7.org/linux/man-pages/man2/rename.2.html).

## ABI Contract

All are LP64/cdecl: `int=int32_t,uint=uint32_t,size_t=uint64_t,ssize_t=int64_t`; `mode_t` is Darwin `uint16_t`, glibc `uint32_t`. Koffi uses `_Out_ Stat*`, `_Out_ uint8_t*`, input `const uint8_t*`/`const char*`, `DIR*=koffi.pointer(koffi.opaque("DIR"))`, and `Dirent*` decoded before the next `readdir`.

| Profile           | Library/symbol exceptions                                                                       | Values                                                                                                                                                                                                                                                                      | Layouts (`field@offset`, bytes)                                                                                                                                                                                                                                                          |
| ----------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Darwin x64        | `/usr/lib/libSystem.B.dylib`; `fstat$INODE64,fstatat$INODE64,fdopendir$INODE64,readdir$INODE64` | `AT_FDCWD=-2;C/EX/DIR/NF/CE=0x200/0x800/0x100000/0x100/0x1000000;AT_NF/RMDIR=0x20/0x80;EXCL/SWAP=4/2;FULL=51;S_IFMT/REG/DIR/LNK=0170000/0100000/0040000/0120000;MODE_FILE/DIR=0600/0700;ERR(EINTR/EIO/EEXIST/ENOSYS/EINVAL/ENOTSUP/EOPNOTSUPP)=4/5/17/78/22/45/102`         | stat144:`dev0:i32,mode4:u16,nlink6:u16,ino8:u64,uid16:u32,gid20:u32,rdev24:i32,times32/48/64/80:i64x2,size96:i64,blocks104:i64,blksize112:i32,flags116:u32,gen120:u32,lspare124:i32,qspare128:i64x2`; dirent1048:`ino0:u64,seek8:u64,reclen16:u16,namlen18:u16,type20:u8,name21:c[1024]` |
| Darwin arm64      | `/usr/lib/libSystem.B.dylib`; unsuffixed                                                        | `AT_FDCWD=-2;C/EX/DIR/NF/CE=0x200/0x800/0x100000/0x100/0x1000000;AT_NF/RMDIR=0x20/0x80;EXCL/SWAP=4/2;FULL=51;S_IFMT/REG/DIR/LNK=0170000/0100000/0040000/0120000;MODE_FILE/DIR=0600/0700;ERR(EINTR/EIO/EEXIST/ENOSYS/EINVAL/ENOTSUP/EOPNOTSUPP)=4/5/17/78/22/45/102`         | stat144:`dev0:i32,mode4:u16,nlink6:u16,ino8:u64,uid16:u32,gid20:u32,rdev24:i32,times32/48/64/80:i64x2,size96:i64,blocks104:i64,blksize112:i32,flags116:u32,gen120:u32,lspare124:i32,qspare128:i64x2`; dirent1048:`ino0:u64,seek8:u64,reclen16:u16,namlen18:u16,type20:u8,name21:c[1024]` |
| glibc Linux x64   | `libc.so.6`; unsuffixed                                                                         | `AT_FDCWD=-100;C/EX/DIR/NF/CE=0x40/0x80/0x10000/0x20000/0x80000;AT_NF/RMDIR=0x100/0x200;NOREPLACE/EXCHANGE=1/2;S_IFMT/REG/DIR/LNK=0170000/0100000/0040000/0120000;MODE_FILE/DIR=0600/0700;ERR(EINTR/EIO/EEXIST/ENOSYS/EINVAL/ENOTSUP/EOPNOTSUPP)=4/5/17/38/22/95/95(alias)` | stat144:`dev0:u64,ino8:u64,nlink16:u64,mode24:u32,uid28:u32,gid32:u32,pad36:i32,rdev40:u64,size48:i64,blksize56:i64,blocks64:i64,times72/88/104:i64x2,reserved120/128/136:i64`; dirent280:`ino0:u64,off8:i64,reclen16:u16,type18:u8,name19:c[256]`                                       |
| glibc Linux arm64 | `libc.so.6`; unsuffixed                                                                         | `AT_FDCWD=-100;C/EX/DIR/NF/CE=0x40/0x80/0x4000/0x8000/0x80000;AT_NF/RMDIR=0x100/0x200;NOREPLACE/EXCHANGE=1/2;S_IFMT/REG/DIR/LNK=0170000/0100000/0040000/0120000;MODE_FILE/DIR=0600/0700;ERR(EINTR/EIO/EEXIST/ENOSYS/EINVAL/ENOTSUP/EOPNOTSUPP)=4/5/17/38/22/95/95(alias)`   | stat128:`dev0:u64,ino8:u64,mode16:u32,nlink20:u32,uid24:u32,gid28:u32,rdev32:u64,pad40:u64,size48:i64,blksize56:i32,pad60:i32,blocks64:i64,times72/88/104:i64x2,reserved120/124:i32`; dirent280:`ino0:u64,off8:i64,reclen16:u16,type18:u8,name19:c[256]`                                 |

Legend: `C/EX/DIR/NF/CE=O_CREAT/O_EXCL/O_DIRECTORY/O_NOFOLLOW/O_CLOEXEC`; `AT_NF/RMDIR=AT_SYMLINK_NOFOLLOW/AT_REMOVEDIR`; rename labels name their flags. Common: `O_RDONLY/O_WRONLY=0/1,LOCK_EX/UN=2/8`, pointer size 8. `koffi.sizeof` must equal each size; byte fixtures prove every offset.

Darwin distinguishes ENOTSUP/EOPNOTSUPP; Linux aliases both=95.

Exact bindings:

```c
int openat(int,const char*,int,...); int fstat(int,_Out_ Stat*);
int fstatat(int,const char*,_Out_ Stat*,int); int mkdirat(int,const char*,mode_t);
ssize_t read(int,_Out_ uint8_t*,size_t); ssize_t write(int,const uint8_t*,size_t);
int fsync(int); int fcntl(int,int,...); int fchmod(int,mode_t); int dup(int);
DIR *fdopendir(int); Dirent *readdir(DIR*); int closedir(DIR*);
int unlinkat(int,const char*,int); int flock(int,int); int close(int);
int renameatx_np(int,const char*,int,const char*,uint32_t);
int renameat2(int,const char*,int,const char*,uint32_t);
```

`openat` supplies Darwin variadic `("int",mode)` (u16 promotion) and glibc `("uint32_t",mode)`; `fcntl(fd,F_FULLFSYNC)` supplies no variadic pair.

## Filesystem Semantics

Open `/`, then every component with `openat(O_DIRECTORY|O_NOFOLLOW|O_CLOEXEC)`; leaf operations stay parent-FD-relative. `dup(fd)` transfers to successful `fdopendir`; `closedir` owns only that duplicate. Retry EINTR only where replay is safe; loop partial reads/writes; zero write is EIO. Capture `koffi.errno()` immediately on `-1`/NULL (`errno=0` before `readdir`); call `close/closedir` once.

`rollback-temp` closes once only if unattempted, verifies recorded dev/inode without following links, `unlinkat`s only that temporary, then synchronizes the parent; cleanup failure is indeterminate and never touches the destination.

| Publication state            | Required success transition                                                             | Failure/cleanup                                                                                                                                                                         |
| ---------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Create private temporary     | `openat(O_WRONLY                                                                        | O_CREAT                                                                                                                                                                                 | O_EXCL | O_NOFOLLOW | O_CLOEXEC,0600)`then`fchmod(0600)` | Destination untouched; `rollback-temp` if created. |
| Write all bytes              | Loop `write` through partial/EINTR completion; zero is EIO.                             | `rollback-temp`; no rename.                                                                                                                                                             |
| Synchronize temporary        | Linux: `fsync(tempFd)`. Darwin: `fsync(tempFd)` then `fcntl(tempFd,F_FULLFSYNC)`.       | `rollback-temp`; no rename.                                                                                                                                                             |
| Close temporary              | One `close(tempFd)`, no retry.                                                          | `rollback-temp` skips re-close; publication forbidden.                                                                                                                                  |
| Rename no-replace            | Linux `renameat2(...,RENAME_NOREPLACE)`; Darwin `renameatx_np(...,RENAME_EXCL)`.        | EEXIST preserves destination and removes temp. Unsupported errors fail closed. Other errors remove only a still-present temp; absent temp means indeterminate publication. No fallback. |
| Synchronize parent directory | Linux: `fsync(parentFd)`. Darwin: `fsync(parentFd)` then `fcntl(parentFd,F_FULLFSYNC)`. | Published destination remains; report durability indeterminate, preserve evidence, never claim success.                                                                                 |

New private directories use `mkdirat(0700)`, `openat`, `fchmod(0700)`, then Linux `fsync(childFd);fsync(parentFd)` or Darwin `fsync+F_FULLFSYNC` on child and parent. CAS/tree removal locks the parent, swaps with a private sentinel, compares detached inode/bytes/tree, then removes or swaps back. ENOSYS/EINVAL/ENOTSUP/EOPNOTSUPP never selects a path/link/rename fallback.

## Execution Flow

```text
approve gate -> persist/reload draft -> local r0
lock A: r1 Validated -> r2 WaitingForApproval -> r3 Ready -> release
lock B: verify r3 -> r4 Executing -> callback -> settle child -> terminal r5 (cancel r5/r6)
-> publish pre-cleanup evidence -> prepare ticket -> release -> RunExecutor cleanup
-> publish final success, or failure report
```

The callback no-replace publishes fixed bytes `Effectify App Builder executable vertical slice\n`. An internal receipt/pre-cleanup observer records r1–r4, terminal, and output digests without exporting a service. Outside-run-tree reports are stable-order LF text, omit absolute paths, and are no-replace. Missing approval makes zero filesystem calls. Commit, callback, hook, cleanup, or reacquisition failure blocks later callbacks/success; inode-checked rollback and recoverable journals/pre-report remain.

## File Changes and Testing

Create `src/internal/{posix-abi,posix-bindings,posix-durable-file-system,executable-evidence}.ts`, `demo/{main,operation,report}.ts`, `demo/deny-network.cjs`, `tsconfig.demo.json`, and four test files. Modify `durable-file-system.ts`, `run-executor.ts` (internal observer), manifests/config, lockfile, and CI.

RED coverage: every profile/symbol/offset/flag/vararg, errno/EINTR/partial/zero-write, DIR ownership, traversal/sync, sentinel rollback, unsupported no-replace, lifecycle/lock/report ordering, and injected failures. Lockfile: `@koromix/koffi-darwin-x64,@koromix/koffi-darwin-arm64,@koromix/koffi-linux-x64,@koromix/koffi-linux-arm64`. CI: `macos-15-intel` x64, `macos-15` arm64, `ubuntu-24.04` x64, `ubuntu-24.04-arm` arm64; frozen install, then guarded `pnpm --offline nx run @effectify/app-builder-execution:{posix-smoke,executable}`.

## Threat Matrix

| Boundary                 | Applicability / RED                       |
| ------------------------ | ----------------------------------------- |
| Documentation-like paths | N/A—fixed entrypoint, no classifier; none |
| Git repository selection | N/A—no Git; none                          |
| Commit state             | N/A—no VCS; none                          |
| Push state               | N/A—no push; none                         |
| PR commands              | N/A—no automation; none                   |

## Migration / Rollout

No migration/flag. Target one PR under 3,000 lines; otherwise auto-chain adapter/conformance then executable. Rollback reverts adapter, command, dependency, and CI together; reports remain. Musl, Windows, and unknown profiles fail selection.

## Open Questions

None.
