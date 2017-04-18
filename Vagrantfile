VAGRANTFILE_API_VERSION = "2"

Vagrant.configure(VAGRANTFILE_API_VERSION) do |node_config|

  node_config.ssh.shell = "bash -c 'BASH_ENV=/etc/profile exec bash'"

  #node_config.vm.box = "ubuntu/trusty64"
  #node_config.vm.box_url = "http://my.monkii.com.au/vagrant/boxes/trusty-server-amd-64-monkii-vagrant.box"
  # node_config.vm.hostname = config['vagrant'][hostname]

  node_config.vm.box = "trusty64"
  node_config.vm.box_url = "https://cloud-images.ubuntu.com/vagrant/trusty/current/trusty-server-cloudimg-amd64-vagrant-disk1.box"

  node_config.vm.provision :shell, path: "setup/bootstrap.sh"
  node_config.vm.provision :shell, path: "setup/startup.sh", run: "always"

  node_config.vm.network :private_network, ip: "192.168.56.105"
  node_config.vm.network :forwarded_port, guest: 80, host: 8081

  node_config.vm.provider :virtualbox do |vb|
    vb.customize [
      "modifyvm", :id,
      "--name", "murrayriver.local",
      "--natdnshostresolver1", "on",
      "--memory", 1024
    ]
  end

  # node_config.vm.synced_folder ".", "/vagrant", nfs: true, :mount_options => ['vers=3,tcp']
  node_config.vm.synced_folder ".", "/vagrant", nfs: true

end
