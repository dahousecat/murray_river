#!/usr/bin/env bash

. "/vagrant/setup/helper-functions.sh"
. "/vagrant/setup/load-variables.sh"

ssh -t monkii@bubbles "sudo chown -R www-data:www-data /var/data/project-data/${PROJECT[name]}/files && sudo chmod -R 777 /var/data/project-data/${PROJECT[name]}/files"
