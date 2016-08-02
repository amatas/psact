# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure("2") do |config|
  config.vm.box = "centos/7"

  config.vm.network "forwarded_port", guest: 3000, host_ip: "127.0.0.1", host: 3000

  config.vm.network "private_network", ip: "192.168.33.10"
  $script = <<SCRIPT
  sudo systemctl disable firewalld ; sudo systemctl stop firewalld
  sudo yum install -y epel-release
  sudo yum install -y vim net-tools docker gcc-c++ make gcc python-virtualenvwrapper
  mkvirtualenv nodejs
  pip install nodeenv
  nodeenv -p -n 4.4.7
  sudo systemctl start docker
  sudo docker run -d --name couchdb -p 5984:5984 klaemo/couchdb
SCRIPT

  config.vm.provision "shell", inline: $script

end
