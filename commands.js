export const commands = [
  // Package Management
  "pacman -Syu",
  "pacman -S",
  "pacman -R",
  "pacman -Rns",
  "pacman -Ss",
  "pacman -Qs",
  "pacman -Si",
  "pacman -Qi",
  "pacman -Qe",
  "pacman -Qdt",
  "pacman -Qdtq | pacman -Rns -",
  "pacman -U",
  "pacman -Sc",
  "pacman -Scc",
  "pacman -Sw",
  "paccache -r",
  "paccache -rk1",
  "yay -S",
  "yay -Syu",
  "yay -Ss",
  "yay -Yc",
  "makepkg -si",
  "makepkg -sric",
  
  // System Management
  "systemctl start",
  "systemctl stop",
  "systemctl restart",
  "systemctl enable",
  "systemctl disable",
  "systemctl status",
  "systemctl daemon-reload",
  "systemctl list-units",
  "systemctl list-unit-files",
  "journalctl -xe",
  "journalctl -f",
  "journalctl -b",
  "journalctl --vacuum-time=2weeks",
  "journalctl -u",
  "timedatectl",
  "timedatectl set-timezone",
  "hostnamectl",
  "hostnamectl set-hostname",
  "localectl",
  "localectl set-locale",
  
  // File Operations
  "ls -lah",
  "chmod +x",
  "chmod 755",
  "chmod 644",
  "chown -R",
  "find / -name",
  "find . -type f",
  "grep -r",
  "grep -i",
  "tar -xzf",
  "tar -czf",
  "tar -xvf",
  "unzip",
  "wget",
  "curl -O",
  "scp",
  "rsync -avz",
  "dd if=/dev/zero of=/dev/null",
  "ln -s",
  
  // Disk & Filesystem
  "df -h",
  "du -sh",
  "lsblk",
  "fdisk -l",
  "mount",
  "umount",
  "mkfs.ext4",
  "mkfs.btrfs",
  "blkid",
  "e2fsck",
  "fsck",
  "mount -o remount,rw /",
  
  // Network
  "ip a",
  "ip link",
  "ip route",
  "ping -c 4",
  "traceroute",
  "netstat -tuln",
  "ss -tuln",
  "nmcli device status",
  "nmcli connection show",
  "nmcli connection up",
  "nmcli connection down",
  "iwctl station wlan0 scan",
  "iwctl station wlan0 get-networks",
  "curl ifconfig.me",
  "wget -qO- ifconfig.me",
  
  // User Management
  "useradd -m",
  "userdel -r",
  "usermod -aG",
  "passwd",
  "groupadd",
  "groups",
  "su -",
  "sudo su",
  "visudo",
  
  // Process Management
  "ps aux",
  "ps aux | grep",
  "top",
  "htop",
  "kill -9",
  "killall",
  "pkill",
  "pgrep",
  "nice -n 10",
  "renice -n 5 -p",
  
  // Bootloader & Kernel
  "grub-mkconfig -o /boot/grub/grub.cfg",
  "grub-install /dev/sda",
  "update-grub",
  "mkinitcpio -P",
  "mkinitcpio -p linux",
  "uname -r",
  "uname -a",
  "modprobe",
  "lsmod",
  "rmmod",
  
  // Arch-specific
  "arch-chroot /mnt",
  "genfstab -U /mnt >> /mnt/etc/fstab",
  "pacstrap /mnt base linux linux-firmware",
  "reflector --country US --age 12 --protocol https --sort rate --save /etc/pacman.d/mirrorlist",
  "reflector --latest 5 --sort rate --save /etc/pacman.d/mirrorlist",
  
  // System Info
  "neofetch",
  "screenfetch",
  "lscpu",
  "lspci",
  "lsusb",
  "free -h",
  "cat /proc/cpuinfo",
  "cat /proc/meminfo",
  "uptime",
  "dmesg | tail",
  
  // Text Editing
  "nano",
  "vim",
  "vi /etc/fstab",
  "cat /etc/pacman.conf",
  "less /var/log/pacman.log",
  "tail -f /var/log/syslog",
  "head -n 20",
  
  // Permissions & Security
  "sudo !!",
  "sudo -i",
  "chmod -R 777",
  "chown root:root",
  "ssh-keygen -t rsa -b 4096",
  "ssh user@host",
  
  // Misc Commands
  "alias ll='ls -lah'",
  "source ~/.bashrc",
  "echo $PATH",
  "export PATH=$PATH:/usr/local/bin",
  "history | grep",
  "clear",
  "exit",
  "reboot",
  "shutdown now",
  "shutdown -h now"
];

// Calculate time limit based on command length
export function getTimeLimit(command) {
  const baseTime = 3; // 3 seconds base
  const charTime = 0.15; // 0.15 seconds per character
  return Math.max(5, baseTime + (command.length * charTime));
}

// Get rank based on completion time vs time limit
export function getRank(timeUsed, timeLimit) {
  const percentage = (timeUsed / timeLimit) * 100;
  
  if (percentage <= 30) return { rank: 'S', color: 'magenta', message: 'LEGENDARY!' };
  if (percentage <= 50) return { rank: 'A', color: 'cyan', message: 'AMAZING!' };
  if (percentage <= 70) return { rank: 'B', color: 'green', message: 'GOOD!' };
  if (percentage <= 90) return { rank: 'C', color: 'yellow', message: 'DECENT!' };
  return { rank: 'D', color: 'red', message: 'TOO SLOW!' };
}
