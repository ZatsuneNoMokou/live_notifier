#!/usr/bin/env bash

RED='\033[0;31m'
LIGHT_BLUE='\033[1;34m'
NC='\033[0m' # No Color
WARNING_CHAR="⚠";
SUCCESS_CHAR="✅";

set +e

cd $(dirname $0)/..
printf "${LIGHT_BLUE}Current dir: $(pwd)${NC}\n\n"

printf "${RED}$WARNING_CHAR Test only cover CSS with Stylelint for now $WARNING_CHAR${NC}\n\n";

printf "${LIGHT_BLUE}Testing CSS...${NC}\n"

stylelint "webextension/**/*.css"
[ $? -eq 0 ] || exit $?; # exit for none-zero return code

printf "\n${LIGHT_BLUE}$SUCCESS_CHAR No errors${NC}"

set -e
