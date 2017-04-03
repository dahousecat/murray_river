#!/bin/bash

# This script sets up a Drupal dev environment. Useful if you've just pulled
# down a database from a production enviroment.

. "/vagrant/setup/load-variables.sh"

cd "/var/www/${VAGRANT[hostname]}"

# Disable modules
drush --root="/var/www/${VAGRANT[hostname]}" dis paranoia -y

# Enable modules
drush --root="/var/www/${VAGRANT[hostname]}" en devel search_krumo devel_debug_log admin_menu admin_menu_toolbar -y

# Disable js aggregation
drush --root="/var/www/${VAGRANT[hostname]}" vset preprocess_js 0 --yes

# Disable css aggregation
drush --root="/var/www/${VAGRANT[hostname]}" vset preprocess_css 0 --yes

# Enable error reporting
drush --root="/var/www/${VAGRANT[hostname]}" vset error_level 2 --yes
