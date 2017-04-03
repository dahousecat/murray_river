#!/usr/bin/env bash

cl() {
	BLUE='\033[1;34m'
	RED='\033[0;31m'
	GREEN='\033[0;32m'
	if [[ $* == *-e* ]]; then # e is for error
		COLOUR=$RED
	elif [[ $* == *-s* ]]; then # s is for sucsess
		COLOUR=$GREEN
	else
		COLOUR=$BLUE
	fi
	NC='\033[0m' # No Color
	echo -e "${COLOUR}$1${NC}"
}

# $1 = key, $2 = value
php-setting-update() {
	if grep -q "$1" /etc/php5/apache2/php.ini; then
   sed -i "s/$1 = .*/$1 = $2/" /etc/php5/apache2/php.ini
  else
    sudo echo "$1 = $2" >> /etc/php5/apache2/php.ini
  fi
}
