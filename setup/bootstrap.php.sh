#!/bin/bash

# Just put an index.php with phpinfo() in webroot

  cat > "/var/www/${VAGRANT[hostname]}/index.php" << EOF
<?php
phpinfo();
EOF