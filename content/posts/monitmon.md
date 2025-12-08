---
title: "How to monitor systems with monit"
author: ["Dirk"]
date: 2025-12-08T11:40:00+01:00
lastmod: 2025-12-08T11:52:28+01:00
tags: ["forensicwheels", "openbsd", "personal", "visibility"]
draft: false
weight: 1004
---

## Introduction <span class="tag"><span class="intro">intro</span></span> {#introduction}

Monitoring a router is something many people forget about, especially at home.
But a router is the heart of the network — when it fails, everything fails.

OpenBSD already provides a strong foundation for reliability and security.
By adding ****Monit**** (a lightweight monitoring tool) and using ****Pushover**** (simple mobile notifications),
you can build a robust alerting and monitoring setup that works even on small hardware.

This article shows how to install, configure, and use Monit to watch essential
router services and send push notifications with Pushover.


## Requirements <span class="tag"><span class="requirements">requirements</span></span> {#requirements}

To follow this guide you need:

-   OpenBSD router (any supported version)
-   Monit installed from packages
-   Basic shell access
-   A Pushover account and an API token (application token)
-   Your Pushover **user key**

All configuration happens in **/etc/monitrc**.


## Installing Monit on OpenBSD <span class="tag"><span class="install">install</span></span> {#installing-monit-on-openbsd}

Installing Monit on OpenBSD is simple:

```sh
pkg_add monit
```

After installation, enable Monit so that it starts automatically:

```sh
echo "monit_flags=" >> /etc/rc.conf.local
rcctl enable monit
rcctl start monit
```

Monit’s main configuration file is:

-   **/etc/monitrc**

You must set permissions correctly, because Monit refuses unsafe files:

```sh
chmod 600 /etc/monitrc
```


## Monit – Essential System and Router Services {#monit-essential-system-and-router-services}

System monitoring runs every ****45 seconds****. The first check is delayed
by ****120 seconds**** to avoid overloading the system immediately after boot.

```cfg
set daemon 45
 with start delay 120
```

Monit logs to ****syslog****. \`idfile\` and \`statefile\` store Monit's
persistent state and identity across restarts.

```cfg
set log syslog
set idfile /var/monit/id
set statefile /var/monit/state
```

Limits control ****buffer sizes**** and ****timeouts**** for
program outputs, network I/O, and service start/stop/restart
operations. This prevents Monit from hanging or processing excessive data.

```cfg
set limits {
     programOutput:     512 B,
     sendExpectBuffer:  256 B,
     fileContentBuffer: 512 B,
     httpContentBuffer: 1 MB,
     networkTimeout:    5 seconds
     programTimeout:    300 seconds
     stopTimeout:       30 seconds
     startTimeout:      30 seconds
     restartTimeout:    30 seconds
}
```

Monit will send alerts via ****local email****. Events are queued under \`/var/monit/events\` to prevent message loss during temporary network problems.

```cfg
set mailserver localhost
set eventqueue
 basedir /var/monit/events
 slots 200
set mail-format { from: root@monit }
set alert root@localhost not on { instance, action }
```

Simply comment out or delete all \`set alert\` entries:

```cfg
# set alert root@localhost not on { instance, action }
```

After this, Monit will ****not send any emails****, but it will still monitor services.

----

Monit HTTP interface is on port ****2812****. Access is restricted to ****localhost****,
a local subnet (\`192.168.X.0/24\`), and an admin user with a password.

```cfg
set httpd port 2812 and
    allow localhost
    allow 192.168.X.0/255.255.255.0
    allow admin:foobar
```

Monit will ****start all monitored services****
automatically on reboot.

```cfg
set onreboot start
```

This monitors ****overall system health****:

-   1- and 5-minute load per CPU core
-   CPU usage
-   Memory and swap usage

If thresholds are exceeded, it triggers \`pushover.sh\` for alerts.

```cfg
check system $HOST
 if loadavg (1min) per core > 2 for 5 cycles then exec /usr/local/bin/pushover.sh
 if loadavg (5min) per core > 1.5 for 10 cycles then exec /usr/local/bin/pushover.sh
 if cpu usage > 95% for 10 cycles then exec /usr/local/bin/pushover.sh
 if memory usage > 75% then exec /usr/local/bin/pushover.sh
 if swap usage > 25% then exec /usr/local/bin/pushover.sh
 group system
```

\`/home\` filesystem is monitored for:

-   Disk space and inode usage
-   Read/write throughput (MB/s and IOPS)
-   Service response time

Alerts are sent via \`pushover.sh\` if any threshold is exceeded.

```cfg
check filesystem home_fs with path /dev/sd0k
 start program = "/sbin/mount /home"
 stop program  = "/sbin/umount /home"
 if space usage > 90% then exec /usr/local/bin/pushover.sh
 if inode usage > 95% then exec /usr/local/bin/pushover.sh
 if read rate > 8 MB/s for 20 cycles then exec /usr/local/bin/pushover.sh
 if read rate > 800 operations/s for 15 cycles then exec /usr/local/bin/pushover.sh
 if write rate > 8 MB/s for 20 cycles then exec /usr/local/bin/pushover.sh
 if write rate > 800 operations/s for 15 cycles then exec /usr/local/bin/pushover.sh
 if service time > 10 milliseconds for 3 times within 15 cycles then exec /usr/local/bin/pushover.sh
 group system
```

Root filesystem \`/\` has similar checks but shorter cycles since it's critical to system stability.

```cfg
check filesystem root_fs with path /dev/sd0a
 start program = "/sbin/mount /"
 stop program  = "/sbin/umount /"
 if space usage > 90% then exec /usr/local/bin/pushover.sh
 if inode usage > 95% then exec /usr/local/bin/pushover.sh
 if read rate > 8 MB/s for 5 cycles then exec /usr/local/bin/pushover.sh
 if read rate > 800 operations/s for 5 cycles then exec /usr/local/bin/pushover.sh
 if write rate > 8 MB/s for 5 cycles then exec /usr/local/bin/pushover.sh
 if write rate > 800 operations/s for 5 cycles then exec /usr/local/bin/pushover.sh
 if service time > 10 milliseconds for 3 times within 5 cycles then exec /usr/local/bin/pushover.sh
 group system
```

Monit ensures ****secure permissions**** for \`/root\`. If permissions are wrong, monitoring for this directory is disabled to avoid false alarms.

```cfg
check directory bin with path /root
 if failed permission 700 then unmonitor
 if failed uid 0 then unmonitor
 if failed gid 0 then unmonitor
 group system
```

A ****network host**** is ping-checked. Frequent failures trigger alerts. Dependencies on
interfaces and services ensure checks only run when the network is up.

```cfg
check host homeassistant with address 192.168.X.19
 if failed ping then alert
 if 5 restarts within 10 cycles then exec /usr/local/bin/pushover.sh
 group network
 depends on iface_in,dhcpd,unbound
```

Monit watches ****network interface**** \`pppoeX\`:

-   Restarts interface if link goes down
-   Alerts on saturation or high upload
-   Limits repeated restarts to avoid loops

<!--listend-->

```cfg
check network iface_out with interface pppoeX
 start program = "/bin/sh /etc/netstart pppoeX"
 if link down then restart else exec /usr/local/bin/pushover.sh
 if changed link then exec /usr/local/bin/pushover.sh
 if saturation > 90% then exec /usr/local/bin/pushover.sh
 if total uploaded > 5 GB in last hour then exec /usr/local/bin/pushover.sh
 if 5 restarts within 10 cycles then exec /usr/local/bin/pushover.sh
 group network
```

****DNS resolver**** \`unbound\` is monitored by PID and port. Failures trigger a restart, repeated failures trigger alerts.

```cfg
check process unbound with pidfile /var/unbound/unbound.pid
 start program = "/usr/sbin/rcctl start unbound"
 stop program  = "/usr/sbin/rcctl stop unbound"
 if failed port 53 for 3 cycles then restart
 if 3 restarts within 10 cycles then exec /usr/local/bin/pushover.sh
 group network
 depends on dnscrypt_proxy,iface_out,iface_in
```

****DHCP server**** is monitored. Missing process triggers a restart. Alerts are sent if failures happen repeatedly.

```cfg
check process dhcpd with matching /usr/sbin/dhcpd
 start program = "/usr/sbin/rcctl start dhcpd"
 stop program  = "/usr/sbin/rcctl stop dhcpd"
 if does not exist then restart
 if 2 restarts within 10 cycles then exec /usr/local/bin/pushover.sh
 group network
 depends on iface_in
```

****NTP daemon**** ensures time synchronization. Missing process triggers restart; repeated issues generate alerts.

```cfg
check process ntpd with matching /usr/sbin/ntpd
 start program = "/usr/sbin/rcctl start ntpd"
 stop program  = "/usr/sbin/rcctl stop ntpd"
 if does not exist then restart
 if 5 restarts within 5 cycles then exec /usr/local/bin/pushover.sh
 group network
 depends on iface_out
```

****vnStat daemon**** monitors network traffic statistics. Monit restarts it if it stops and alerts on repeated failures.

```cfg
check process vnstatd with matching /usr/local/sbin/vnstatd
 start program = "/usr/sbin/rcctl start vnstatd"
 stop program  = "/usr/sbin/rcctl stop vnstatd"
 if does not exist then restart
 if 5 restarts within 15 cycles then exec /usr/local/bin/pushover.sh
 group network
 depends on iface_out
```


## Adding Pushover Alerts <span class="tag"><span class="pushover">pushover</span></span> {#adding-pushover-alerts}

Pushover provides a simple HTTPS API for sending notifications to your phone.

Monit can call an external script.
Create **/usr/local/bin/pushover.sh**:

```sh
#!/bin/sh
TOKEN="YOUR_PUSHOVER_API_TOKEN"
USER="YOUR_PUSHOVER_USER_KEY"

/usr/local/bin/curl -s \
 -F "token=$TOKEN" \
 -F "user=$USER" \
 --form-string "message=[$MONIT_HOST] $MONIT_SERVICE - $MONIT_EVENT - $MONIT_DESCRIPTION" \
 https://api.pushover.net/1/messages.json
```

Make it executable:

```sh
chmod +x /usr/local/bin/pushover.sh
```

Now the checks which contain the "exec /usr/local/bin/pushover.sh" line will trigger pushover notifications:

```cfg
check process vnstatd with matching /usr/local/sbin/vnstatd
 start program = "/usr/sbin/rcctl start vnstatd"
 stop program  = "/usr/sbin/rcctl stop vnstatd"
 if does not exist then restart
 if 5 restarts within 15 cycles then exec /usr/local/bin/pushover.sh
 group network
 depends on iface_out
```

Monit will automatically send the full text of the event to Pushover.


## Testing and Maintenance <span class="tag"><span class="ops">ops</span></span> {#testing-and-maintenance}


### Test your configuration {#test-your-configuration}

```sh
monit -t      # syntax check
monit reload  # reload configuration
monit summary # Show command line overview
monit status vnstatd # Show check status
```


## Conclusion <span class="tag"><span class="conclusion">conclusion</span></span> {#conclusion}

Using Monit together with Pushover is an excellent way to keep a close eye on an OpenBSD router.
Monit is tiny, fast, and reliable — perfect for embedded hardware.
Pushover provides instant alerts with almost no configuration or overhead.

For a home router or small business network, this combination gives you
semi professional-grade monitoring with minimal effort.

{{< giscus >}}
