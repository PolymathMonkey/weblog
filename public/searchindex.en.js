var relearn_searchindex = [
  {
    "breadcrumb": "Welcome",
    "content": "Welcome to my technical blog and knowledge base!\nTopics 🖥 Threathunting Tutorials 🖥 OpenBSD Latest posts Threathunting I: Network setup 08.07.2025 Get in Touch Suggestions or feedback?\nContact me here or visit the project repository.\nYou can also subscribe via RSS.",
    "description": "Latest posts",
    "tags": [],
    "title": "Forensic wheels",
    "uri": "/posts/index.html"
  },
  {
    "breadcrumb": "",
    "content": "Welcome to my technical blog and knowledge base!\nTopics 🖥 Threathunting Tutorials 🖥 All things OpenBSD Latest posts Threathunting I: Network setup 08.07.2025 Get in Touch Suggestions or feedback?\nContact me here or visit the project repository.\nYou can also subscribe via RSS.",
    "description": "Latest posts",
    "tags": [],
    "title": "Welcome",
    "uri": "/index.html"
  },
  {
    "breadcrumb": "Welcome \u003e Forensic wheels",
    "content": "Introduction Why I Built a Home Lab for Threat Hunting 🕵 Network Setup Topology, Hardware and Tools 🛠 Firewall configuration🧱 Switch configuration What I Learned Whats next Introduction This is a small series I wanted to start, where I write about my small threathunting setup and describe a little what I build and what I am doing with it.\nIn this part, I will describe the Network setup for my Environment, more about how I build the honeypots and the ELK Server I will describe in the follow up articles about threathunting.\nKeep in mind this is for Education and fun, no serious stuff going on here.\nWhy I Built a Home Lab for Threat Hunting 🕵 The threat landscape is constantly evolving, with new attack vectors, tools, and tactics appearing almost daily.\nAnd to keep my skills current with real-world threats, I built a home lab dedicated to threat hunting. This environment allows me to safely observe attacks and develop detection and defense methods. I deployed web and shell honeypots, and collect real threat data in a controlled setting.\nIt’s a practical, hands-on way to explore the behavior of adversaries and its a lot of fun!\nNetwork Setup Topology, Hardware and Tools 🛠 In the Picture you can see the switch setup, port 1 is uplink, port2 my admin workstation, port 3 is the cowrie honeypot, port 4 is for home assistant and port 5 is for the ELK.\nFor the hardware setup, I kept things lightweight and affordable by using Raspberry Pi devices and open-source tools. The honeypot is based on the well-known Cowrie SSH honeypot and the honeyhttpd HTTP honeypot . It runs on a Raspberry Pi 4 with 8GB of RAM, hosted inside a Docker 🐳 container. On the honeypot host, Filebeat is running to ingest the Cowrie logs into the ELK stack.\nFor the ELK stack, I used a Raspberry Pi 5 with 16GB of RAM, running Debian. The ELK services are also containerized using Docker. The stack is based on the DShield-SIEM project, which I customized to better fit my needs. I’ll dive deeper into those modifications and the ELK setup in a follow-up article.\nThe network topology is straightforward but deliberately segmented. The router is connected to a managed switch, which is responsible for handling VLAN separation. Both the honeypot and the ELK server are connected to this switch and are placed in an isolated VLAN (VLAN210). This VLAN is dedicated exclusively to threat hunting, ensuring that any potentially malicious traffic remains fully contained and cannot interfere with the rest of the home network.\nMy client system 💻 is the only machine allowed to connect from outside the VLAN to both the ELK server and the honeypot. This connection is strictly for maintenance and administrative purposes. The ELK server is allowed to access the internet, primarily to pull threat intelligence data from external sources and security feeds.\nIn contrast, the honeypot is completely blocked from internet access, with the exception of SSH and HTTP traffic going in and out of it. These are the only services deliberately exposed to simulate vulnerable endpoints. Communication between the honeypot and the ELK server is allowed for log ingestion and analysis. However, I intend to introduce stricter controls on this internal traffic in the future to further reduce the attack surface.\nFirewall configuration🧱 For the pf(1) configuration It was as always with UNIX fairly easy to get to work:\nmatch in quick log on egress proto tcp from any to any port 22 flags S/SA rdr-to $honeypot port 2222 match in quick log on egress proto tcp from any to any port 443 flags S/SA rdr-to $honeypot port 4433 This rule makes sure any incoming TCP connection attempt to port 22 (SSH) and port 443 (HTTPS) is immediately intercepted, logged, and transparently redirected to the $honeypot server listening on port 2222 or 4433 for HTTPS Traffic.\nSwitch configuration Here you can see my managed switch configuration. Port 5 (honeypot) is only assigned to VLAN210 like port 5 too, port 2 is the router it needs to talk into both networks and at port 1 is my workstation to access the theathunting environment.\nWhat I Learned Building and maintaining this lightweight honeypot and monitoring setup on Raspberry Pi devices has been an insightful experience. Here are some key takeaways:\nResource Efficiency: Raspberry Pis provide a surprisingly capable platform for running complex services like Cowrie honeypot and the ELK stack in Docker containers, keeping costs and power consumption low.\nNetwork Segmentation Matters: Isolating the honeypot and ELK server in a dedicated VLAN (VLAN210) effectively contains malicious traffic, protecting the rest of the home network from potential threats.\nControlled Access Is Crucial: Restricting external access to only authorized clients and limiting the honeypot’s internet connectivity reduces the attack surface while still enabling useful data collection.\nLogging and Data Collection: Using Filebeat to ship logs from the honeypot to the ELK stack provides real-time visibility into attacker behavior, which is essential for threat hunting and incident response.\nCustomization Pays Off: Adapting existing tools and SIEM projects (like DShield) to specific needs improves effectiveness and allows for tailored threat detection.\nFuture Improvements: There is always room to tighten internal communication rules and harden the setup further to minimize risk and improve operational security.\nThis project highlights the balance between practical constraints and security needs, demonstrating that even modest hardware can contribute significantly to threat intelligence and network defense.\nI drew inspiration for this setup from the DShield SIEM project by SANS and would like to express my gratitude for their valuable work.\nWhats next Next I had to build the ssh honeypot and the HTTP Honeypot, stay tuned for the follow up!",
    "description": "Introduction Why I Built a Home Lab for Threat Hunting 🕵 Network Setup Topology, Hardware and Tools 🛠 Firewall configuration🧱 Switch configuration What I Learned Whats next Introduction This is a small series I wanted to start, where I write about my small threathunting setup and describe a little what I build and what I am doing with it.",
    "tags": [
      "Threathunting",
      "Honeypot",
      "Visibility"
    ],
    "title": "Threathunting I: Network setup",
    "uri": "/posts/threathuntingnet/index.html"
  },
  {
    "breadcrumb": "Welcome",
    "content": "Hi, I’m Dirk — a security engineer with a deep passion for skateboarding and digital forensics. I help my company protect networks and systems against evolving cybersecurity threats through a mix of technical expertise and continuous learning.\nSkateboarding is more than a hobby to me; it’s a source of creativity, freedom, and community. It shapes how I approach challenges — with persistence, balance, and a mindset open to innovation.\nBeyond that, I’m an OpenBSD enthusiast. I’ve built an OpenBSD-based router and threat-hunting infrastructure to stay ahead in cybersecurity. I appreciate OpenBSD for its simplicity, security, and elegance — qualities I strive to bring to my work.\nI’m also a longtime Emacs user, relying on it daily for coding, writing, and organizing my thoughts. It’s part of how I stay productive and focused.\nIn cybersecurity, I’m committed to continuous growth and adapting to new challenges. When I’m not working on security projects, you’ll find me skating or exploring new ideas inspired by Zen philosophy.\nYou can download my CV as a signed and encrypted PDF for authenticity and privacy. If you need the password to decrypt it, please send me an E-mail\nStay tuned for updates on my journey as a security engineer, skateboarder, and lifelong learner.\nKey ID: `0xC2920C559CAD6CB` Fingerprint: `40CA 727E 96D3 CC2D 8CBB 1540 0C29 20C5 59CA D6CB` SHA-256 Hash: `c7359e0e8bd69ed7cee3ea97453c10e327bfe2416822f54c6390efe72b0d6e7a` publickey",
    "description": "Short intro about myself",
    "tags": [
      "Forensicwheels",
      "Personal"
    ],
    "title": "about",
    "uri": "/about/index.html"
  },
  {
    "breadcrumb": "Welcome",
    "content": "",
    "description": "",
    "tags": [],
    "title": "Categories",
    "uri": "/categories/index.html"
  },
  {
    "breadcrumb": "Welcome \u003e Tags",
    "content": "",
    "description": "",
    "tags": [],
    "title": "Tag - Honeypot",
    "uri": "/tags/honeypot/index.html"
  },
  {
    "breadcrumb": "Welcome",
    "content": "",
    "description": "",
    "tags": [],
    "title": "Tags",
    "uri": "/tags/index.html"
  },
  {
    "breadcrumb": "Welcome \u003e Tags",
    "content": "",
    "description": "",
    "tags": [],
    "title": "Tag - Threathunting",
    "uri": "/tags/threathunting/index.html"
  },
  {
    "breadcrumb": "Welcome \u003e Categories",
    "content": "",
    "description": "",
    "tags": [],
    "title": "Category - Threathunting",
    "uri": "/categories/threathunting/index.html"
  },
  {
    "breadcrumb": "Welcome \u003e Tags",
    "content": "",
    "description": "",
    "tags": [],
    "title": "Tag - Visibility",
    "uri": "/tags/visibility/index.html"
  },
  {
    "breadcrumb": "Welcome \u003e Tags",
    "content": "",
    "description": "",
    "tags": [],
    "title": "Tag - Forensicwheels",
    "uri": "/tags/forensicwheels/index.html"
  },
  {
    "breadcrumb": "Welcome \u003e Tags",
    "content": "",
    "description": "",
    "tags": [],
    "title": "Tag - Personal",
    "uri": "/tags/personal/index.html"
  },
  {
    "breadcrumb": "Welcome \u003e Categories",
    "content": "",
    "description": "",
    "tags": [],
    "title": "Category - Personal",
    "uri": "/categories/personal/index.html"
  }
]
