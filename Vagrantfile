# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure("2") do |config|
  config.vm.box = "centos71"

  config.vm.network "forwarded_port", guest: 3000, host_ip: "127.0.0.1", host: 3000

  config.vm.network "private_network", ip: "192.168.33.10"
  config.vm.provision "shell",
        inline: "sudo systemctl disable firewalld ; sudo systemctl stop firewalld"

end
