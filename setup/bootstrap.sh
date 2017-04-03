#!/bin/bash

# By storing the date now, we can calculate the duration of provisioning at the
# end of this script.
START_SECONDS="$(date +%s)"

. "/vagrant/setup/helper-functions.sh"

##################################
#        Set up variables        #
##################################

. "/vagrant/setup/variables.sh"


##################################
#          Provisioning          #
##################################

# Don't ask for anything
export DEBIAN_FRONTEND=noninteractive

# Set MySQL root password
debconf-set-selections <<< "mysql-server-5.5 mysql-server/root_password password ${DB[pass]}"
debconf-set-selections <<< "mysql-server-5.5 mysql-server/root_password_again password ${DB[pass]}"


# Don't update more than one per day
if [ -f /var/log/vagrant_provision_last_update_time.log ]; then
	LAST_UPDATED=`cat /var/log/vagrant_provision_last_update_time.log`
	DAY_AGO=`date +%s --date='-1 day'`
else
	LAST_UPDATED=""
fi

if [ -z "$LAST_UPDATED" ] || [ "$LAST_UPDATED" -lt "$DAY_AGO" ]; then

	# Install packages
	cl "Install / update packages"
	apt-get update

	apt-get install -q -f -y --force-yes -o Dpkg::Options::='--force-confdef' -o Dpkg::Options::='--force-confold' mysql-server-5.5 php5-mysql libsqlite3-dev apache2 php5 libapache2-mod-php5 php5-dev build-essential php-pear ruby1.9.1-dev php5-mcrypt php5-curl git php5-gd imagemagick language-pack-en-base unzip php5-xdebug postfix mailutils git
	apt-get -y remove puppet chef chef-zero puppet-common

	# Make log file to save last updated time
	date +%s > /var/log/vagrant_provision_last_update_time.log

else
	cl "Updates last ran less than a day ago so skipping"
fi

# Set timezone
echo "Australia/Melbourne" | tee /etc/timezone
dpkg-reconfigure --frontend noninteractive tzdata


# Link repository webroot to server webroot
if [ ! -h "/var/www/${VAGRANT[hostname]}" ]; then
  ln -fs "/vagrant/www" "/var/www/${VAGRANT[hostname]}"
fi


# Make sure symlinks to import and export database scripts exist
if [ ! -h "/usr/local/bin/load-db" ]; then
  ln -s /vagrant/scripts/load-db /usr/local/bin/load-db
fi
if [ ! -h "/usr/local/bin/save-db" ]; then
  ln -s /vagrant/scripts/save-db /usr/local/bin/save-db
fi


# Setup database
NEW_DB=false
if ! mysql -u root -p${DB[root_pass]} -e "use ${DB[name]}" >/dev/null 2>&1; then
	NEW_DB=true
	cl "Setting up database..."
	cl "Database name: ${DB[name]}"
	cl "Database username: ${DB[user]}"

	cat | mysql -u root -ppassword << EOF
	DROP DATABASE IF EXISTS test;
	CREATE DATABASE ${DB[name]};
	GRANT ALL ON ${DB[name]}.* TO '${DB[user]}'@'${DB[host]}' identified by '${DB[pass]}';
	FLUSH PRIVILEGES;
EOF

fi

# Setup apache
echo "ServerName localhost" >> /etc/apache2/apache2.conf
a2enmod rewrite
a2enmod ssl

sed -e "s/site-name.local/${VAGRANT[hostname]}/g" /vagrant/setup/files/host.conf >/etc/apache2/sites-available/host.conf
cp /vagrant/setup/files/xdebug.ini /etc/php5/mods-available/xdebug.ini

# Create .my.cnf
cp /vagrant/setup/files/my.cnf /home/vagrant/.my.cnf

# SSH config
#cp /vagrant/setup/files/ssh/* /root/.ssh/
#chmod 400 /root/.ssh/id_sls
#ssh-keyscan -H slsapp.com >> ~/.ssh/known_hosts

a2ensite host
a2dissite 000-default

# Configure PHP
php-setting-update display_errors 'On'
php-setting-update error_reporting 'E_ALL | E_STRICT'
php-setting-update html_errors 'On'
php-setting-update xdebug.max_nesting_level '256'



# Configure postfix
#if [ -f /etc/postfix/main.cf ]; then
#	sed -i '/relayhost =/c relayhost = devrelay.in.monkii.com' /etc/postfix/main.cf
#	service postfix restart
#fi

# Make sure things are up and running as they should be
service apache2 restart

# Say how long the script took to execute (with the seconds in bold yellow)
END_SECONDS="$(date +%s)"
YELLOW='\033[0;33m'
BLUE='\033[1;34m'
BOLD=$(tput bold)
NORMAL=$(tput sgr0)
cl "Provisioning complete in ${YELLOW}${BOLD}"$(expr $END_SECONDS - $START_SECONDS)"${NORMAL} ${BLUE}seconds\n"
