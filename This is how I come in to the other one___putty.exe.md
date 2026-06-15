<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# This is how I come in to the other one:

putty.exe -i "C:\Users\Jeff Domingo\Videos\newkeymeeting.ppk" [root@app.meetinggenius.ca](mailto:root@app.meetinggenius.ca)

NOw I have this messages can you tell me how to come in to this thanks

I am jeff by the way

jeff
[5:10 PM](https://proj.asccreative.com/external-devs/pl/qhpy69nxrpy83f9jbijeo49c4a)
Hi @gary can I have a server where I upload the core agent thanks
jeff
[6:42 PM](https://proj.asccreative.com/external-devs/pl/y8srzsmh97yqxmxgbsqhxd3gky)
@gary ?
gary
[11:45 PM](https://proj.asccreative.com/external-devs/pl/pdznx9k5j7yfuqiqqn9tbg6pyr)
you have that one ?
38.49.216.119 ?
it is a empty server for you
you can use same key as app.meetinggen
btw what the server for , do you need a domain for it ?
current domain pointe to it is
mgllm.asccreative.com
Yesterday
jeff
[8:06 AM](https://proj.asccreative.com/external-devs/pl/yx7oxqsbppr6py68re69eq44yw)
oh ok thanks

gary
[7:23 AM](https://proj.asccreative.com/external-devs/pl/5ijn3rpi9ffs3f5bn3k7zjqdir)
@jeff I had assgined another domain  vanguard.asccreative.com  to the mgllm instance , tim told me the vps is for another project

Based on the conversation with Gary, here is the PuTTY command you need to connect to your new server, Jeff.

## Your New Server Details

From the chat, Gary assigned you:

- **IP Address:** `38.49.216.119`
- **Domain:** `vanguard.asccreative.com` (updated by Gary; `mgllm.asccreative.com` was reassigned)
- **Same SSH key** as the one you use for `app.meetinggenius.ca`


## Command to Connect

Just follow the same pattern as your existing command, but replace the host with the new server. Open your command prompt and run:

```
putty.exe -i "C:\Users\Jeff Domingo\Videos\newkeymeeting.ppk" root@38.49.216.119
```

Or using the domain:

```
putty.exe -i "C:\Users\Jeff Domingo\Videos\newkeymeeting.ppk" root@vanguard.asccreative.com
```

Both should work since Gary pointed the domain to that IP. Using the domain `vanguard.asccreative.com` is generally preferred so you don't have to worry if the IP ever changes.[^1_1]

## Quick Recap of What Changed

| Parameter | Old Server | New Server |
| :-- | :-- | :-- |
| Host | `app.meetinggenius.ca` | `vanguard.asccreative.com` |
| IP | *(existing)* | `38.49.216.119` |
| Key file | `newkeymeeting.ppk` | **Same key** ✅ |
| User | `root` | `root` |

Gary confirmed you can use the same `.ppk` key file, so no need to generate a new one.[^1_1]
<span style="display:none">[^1_10][^1_2][^1_3][^1_4][^1_5][^1_6][^1_7][^1_8][^1_9]</span>

<div align="center">⁂</div>

[^1_1]: https://horkan.com/2023/10/08/step-by-step-instructions-to-load-and-use-a-ppk-file-in-putty

[^1_2]: https://scitas-doc.epfl.ch/advanced-guide/configure-putty/

[^1_3]: https://stackoverflow.com/questions/35702516/putty-unable-to-use-key-file-not-a-private-key

[^1_4]: https://www.ssh.com/academy/ssh/putty/windows/puttygen

[^1_5]: https://docs.oracle.com/en-us/iaas/Content/Compute/Tasks/connect-to-linux-instance-from-windows-putty.htm

[^1_6]: https://putty.org.ru/manual/chapter10

[^1_7]: https://documentation.help/putty/documentation.pdf

[^1_8]: https://www.developpez.net/forums/d1759404/logiciels/logiciels-libres-open-source/utilitaires-securites/putty-ligne-commande-incluant-cle-ssh-ppk/

[^1_9]: https://www.bluehost.com/blog/using-ssh-on-windows-putty/

[^1_10]: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/connect-linux-inst-from-windows.html


---

# Using username "root".

Authenticating with public key "root@app.meetinggenius.ca"
Welcome to Ubuntu 24.04.4 LTS (GNU/Linux 6.8.0-54-generic x86_64)

* Documentation:  [https://help.ubuntu.com](https://help.ubuntu.com)
* Management:     [https://landscape.canonical.com](https://landscape.canonical.com)
* Support:        [https://ubuntu.com/pro](https://ubuntu.com/pro)

System information as of Sun Jun 14 19:39:59 PDT 2026

System load:  0.0                Processes:             113
Usage of /:   3.3% of 483.29GB   Users logged in:       0
Memory usage: 8%                 IPv4 address for eth0: 38.49.216.119
Swap usage:   9%

* Strictly confined Kubernetes makes edge and IoT secure. Learn how MicroK8s
just raised the bar for easy, resilient and secure K8s cluster deployment.

[https://ubuntu.com/engage/secure-kubernetes-at-the-edge](https://ubuntu.com/engage/secure-kubernetes-at-the-edge)

Expanded Security Maintenance for Applications is not enabled.

33 updates can be applied immediately.
To see these additional updates run: apt list --upgradable

1 additional security update can be applied with ESM Apps.
Learn more about enabling ESM Apps service at [https://ubuntu.com/esm](https://ubuntu.com/esm)

*** System restart required ***
Last login: Sat Jun 13 08:45:38 2026 from 50.67.137.80
root@mgllm:~\# ls
root@mgllm:~\# docker ps
CONTAINER ID   IMAGE           COMMAND                  CREATED        STATUS        PORTS                                             NAMES
2f6f18288893   alpine/ollama   "/usr/bin/ollama ser…"   3 months ago   Up 3 months   0.0.0.0:11434->11434/tcp, [::]:11434->11434/tcp   ollama
root@mgllm:~\#

You're successfully connected to the new server! Here's a quick summary of what you're looking at:

## Server Status Overview

You're logged in as `root` on the server `mgllm` (IP: `38.49.216.119`) running **Ubuntu 24.04.4 LTS** with a 483GB disk, and it's mostly empty and idle — only **3.3% disk used** and **8% memory usage**, so it's ready for your work.

## What's Already Running

There is one Docker container already active on this server:


| Container | Image | Port | Status |
| :-- | :-- | :-- | :-- |
| `ollama` | `alpine/ollama` | `11434` | Up 3 months ✅ |

**Ollama** is an LLM (Large Language Model) runner — it's what serves AI models locally. It's been running for 3 months and is listening on port `11434`.

## Things to Note

- The `ls` command returned **nothing**, meaning your home directory (`/root`) is currently empty — a clean slate for your project.
- There are **33 pending system updates** and **1 security update**. It's good practice to run them when you're ready:

```
apt update && apt upgrade -y
```

- A **system restart is required** (likely from a previous kernel update). Plan for a quick reboot when convenient:

```
reboot
```


You're all set to start uploading your core agent to this server. What would you like to do next — set up a folder structure, deploy via Git, or upload files directly?

