#!/bin/bash
# hchain Agent框架自检脚本
# 运行: bash .claude/skills/references/validate.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "========================================="
echo "  hchain Agent 框架自检"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================="
echo ""

PASS=0
FAIL=0
WARN=0

check_count() {
  local label="$1"
  local expected="$2"
  local actual="$3"
  if [ "$actual" -eq "$expected" ]; then
    echo -e "  ${GREEN}✅${NC} $label: $actual (预期: $expected)"
    PASS=$((PASS + 1))
  elif [ "$actual" -gt "$expected" ]; then
    echo -e "  ${YELLOW}⚠️${NC}  $label: $actual (预期: $expected, 多了 $((actual - expected)))"
    WARN=$((WARN + 1))
  else
    echo -e "  ${RED}❌${NC} $label: $actual (预期: $expected, 少了 $((expected - actual)))"
    FAIL=$((FAIL + 1))
  fi
}

check_exists() {
  local label="$1"
  local path="$2"
  if [ -f "$path" ]; then
    echo -e "  ${GREEN}✅${NC} $label: $path"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}❌${NC} $label: $path 缺失"
    FAIL=$((FAIL + 1))
  fi
}

check_frontmatter() {
  local label="$1"
  local file="$2"
  local field="$3"
  if grep -q "^${field}:" "$file" 2>/dev/null; then
    echo -e "    ${GREEN}✅${NC} ${field}"
    return 0
  else
    echo -e "    ${RED}❌${NC} ${field} 缺失"
    return 1
  fi
}

# ===== 1. 目录和文件数量 =====
echo "📂 文件数量检查"
AGENT_COUNT=$(ls .claude/agents/*.md 2>/dev/null | wc -l)
CMD_COUNT=$(ls .claude/commands/*.md 2>/dev/null | wc -l)
WF_COUNT=$(ls .claude/workflows/*.yaml 2>/dev/null | wc -l)
check_count "Agent 文件" 10 "$AGENT_COUNT"
check_count "Command 文件" 7 "$CMD_COUNT"
check_count "Workflow 文件" 5 "$WF_COUNT"
echo ""

# ===== 2. 关键文件存在性 =====
echo "🔍 关键文件检查"
check_exists "CLAUDE.md" ".claude/CLAUDE.md"
check_exists "settings.json" ".claude/settings.json"
check_exists "bus.jsonl" ".claude/memory/bus.jsonl"
check_exists "SKILL.md" ".claude/skills/SKILL.md"
check_exists "validate.sh" ".claude/skills/references/validate.sh"
echo ""

# ===== 3. Agent frontmatter 完整性 =====
echo "📝 Agent frontmatter 检查"
for agent in .claude/agents/*.md; do
  agent_name=$(basename "$agent" .md)
  echo "  $agent_name:"
  check_frontmatter "$agent_name" "$agent" "name"
  check_frontmatter "$agent_name" "$agent" "description"
  check_frontmatter "$agent_name" "$agent" "model"
  check_frontmatter "$agent_name" "$agent" "tools"
done
echo ""

# ===== 4. MCP Server 检查 =====
echo "🔧 MCP Server 检查"
if [ -f "dist/index.js" ]; then
  echo -e "  ${GREEN}✅${NC} dist/index.js 存在"
  PASS=$((PASS + 1))
else
  echo -e "  ${YELLOW}⚠️${NC}  dist/index.js 缺失，运行 npm run build"
  WARN=$((WARN + 1))
fi

if [ -f "package.json" ]; then
  VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "?")
  echo -e "  ${GREEN}✅${NC} package.json (v$VERSION)"
  PASS=$((PASS + 1))
else
  echo -e "  ${RED}❌${NC} package.json 缺失"
  FAIL=$((FAIL + 1))
fi
echo ""

# ===== 5. GitHub 集成检查 =====
echo "🐙 GitHub 集成检查"
TEMPLATE_COUNT=$(ls .github/ISSUE_TEMPLATE/*.md 2>/dev/null | wc -l)
check_count "Issue 模板" 3 "$TEMPLATE_COUNT"
check_exists "agent-trigger.yml" ".github/workflows/agent-trigger.yml"
check_exists "ci.yml" ".github/workflows/ci.yml"
echo ""

# ===== 汇总 =====
TOTAL=$((PASS + FAIL + WARN))
echo "========================================="
echo "  自检完成: ✅${PASS} ⚠️${WARN} ❌${FAIL} / $TOTAL"
echo "========================================="

if [ "$FAIL" -gt 0 ]; then
  echo "  ${RED}存在 $FAIL 个问题需要修复${NC}"
  exit 1
elif [ "$WARN" -gt 0 ]; then
  echo "  ${YELLOW}存在 $WARN 个警告${NC}"
  exit 0
else
  echo "  ${GREEN}全部通过！框架就绪${NC}"
  exit 0
fi
