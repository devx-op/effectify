#!/bin/bash

# Test GitHub Actions workflows locally using act
# Usage: ./scripts/test-workflows.sh [workflow-name]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Testing GitHub Actions Workflows Locally${NC}"
echo "================================================"

# Check if act is installed
if ! command -v act &> /dev/null; then
    echo -e "${RED}❌ act is not installed. Please install it first:${NC}"
    echo "brew install act"
    exit 1
fi

# Function to test a specific workflow
test_workflow() {
    local workflow_name=$1
    local workflow_file=".github/workflows/${workflow_name}.yml"
    
    if [ ! -f "$workflow_file" ]; then
        echo -e "${RED}❌ Workflow file not found: $workflow_file${NC}"
        return 1
    fi
    
    echo -e "${YELLOW}🔍 Testing workflow: $workflow_name${NC}"
    echo "File: $workflow_file"
    echo "----------------------------------------"
    
    # Test the workflow (list jobs first)
    echo -e "${BLUE}📋 Listing jobs in workflow:${NC}"
    act -W "$workflow_file" --list
    
    echo -e "${BLUE}🧪 Testing workflow syntax:${NC}"
    act -W "$workflow_file" --list > /dev/null
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Workflow $workflow_name passed dry-run test${NC}"
    else
        echo -e "${RED}❌ Workflow $workflow_name failed dry-run test${NC}"
        return 1
    fi
    
    echo ""
}

# Function to list available workflows
list_workflows() {
    echo -e "${BLUE}📋 Available workflows:${NC}"
    for workflow in .github/workflows/*.yml; do
        if [ -f "$workflow" ]; then
            basename "$workflow" .yml
        fi
    done
    echo ""
}

# Main logic
if [ $# -eq 0 ]; then
    echo -e "${YELLOW}No workflow specified. Testing all workflows...${NC}"
    echo ""
    
    # Test all workflows
    for workflow in .github/workflows/*.yml; do
        if [ -f "$workflow" ]; then
            workflow_name=$(basename "$workflow" .yml)
            test_workflow "$workflow_name"
        fi
    done
    
    echo -e "${GREEN}🎉 All workflows tested!${NC}"
    
elif [ "$1" = "list" ]; then
    list_workflows
    
elif [ "$1" = "help" ]; then
    echo -e "${BLUE}Usage:${NC}"
    echo "  ./scripts/test-workflows.sh                    # Test all workflows"
    echo "  ./scripts/test-workflows.sh <workflow-name>    # Test specific workflow"
    echo "  ./scripts/test-workflows.sh list               # List available workflows"
    echo "  ./scripts/test-workflows.sh help               # Show this help"
    echo ""
    echo -e "${BLUE}Examples:${NC}"
    echo "  ./scripts/test-workflows.sh ci"
    echo "  ./scripts/test-workflows.sh release"
    echo ""
    list_workflows
    
else
    test_workflow "$1"
fi

echo -e "${BLUE}💡 Tips:${NC}"
echo "  - Use 'act -W .github/workflows/ci.yml --list' to list CI jobs"
echo "  - Use 'act -W .github/workflows/release.yml --list' to list release jobs"
echo "  - Use 'act -W .github/workflows/ci.yml -j build' to run specific job"
echo "  - Add '--secret-file .secrets' to use local secrets"
echo "  - Add '--container-architecture linux/amd64' for M1/M2 Macs"
echo ""
