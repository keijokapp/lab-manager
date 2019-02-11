Lab manager is a laboratory management API service originally inspired by [I-Tee](https://github.com/magavdraakon/i-tee).

It provides RESTful API and decent browser-based UI for managing labs, lab instances and related resources. It has limited I-Tee API compatibility layer and lab instance import feature  (actual I-Tee instance is currently needed for these).

**Features:**

 * Managing laboratories and instances
   * VirtualBox virtual machines with [i-tee-virtualbox](https://github.com/keijokapp/i-tee-virtualbox)
   * Browser-based remote console support for VirtualBox machines with [lab-remote](https://github.com/keijokapp/lab-remote)
   * LXD containers
   * Serving Git repositories to lab instances
   * Lab endpoints with [lab-proxy](https://github.com/keijokapp/lab-proxy)
   * Creating GitLab user and group for lab instances
   * Virtual Teaching Assistant (proprietary software of RangeForce)
 * Managing VirtualBox machines and templates
   * Browser-based remote console support for VirtualBox machines with [lab-remote](https://github.com/keijokapp/lab-remote)
   * Retrieving and changing machine state
   * Snapshotting
 * Git repositories
   * Serving Git repositories to authorized clients
   * API for fetching repositories from remotes (e.g. triggered by webhook)


## Installation

### Prerequisites

These instructions are based on Ubuntu 18.04.

Install NodeJS and recommended Systemd dependency:
```
apt install nodejs npm libsystemd-dev
```

**Note:** Systemd development files need to be installed before application installation to make Systemd notifications work. Otherwise installation gives an error regarding to `sd-notify` which can be ignored if Systemd notifications are not needed.

### Quick start

```
npm install https://github.com/keijokapp/lab-manager

lab-manager /path/to/config-file.json
```

Example configuration is shown in [config_sample.json](config_sample.json). Only `database`, `listen` and `appUrl` options are required. Other options can be provided to turn on features.

 | Option | Description |
 |--------|-------------|
 | `listen` | Listener configuration - `"systemd"` in case of Systemd socket or `object` |
 | `listen.port`, `listen.address` | Listen address (optional) and port |
 | `listen.path`, `listen.mode` | UNIX socket path and mode (optional) |
 | `appUrl` | Public (related to other components) URL prefix of the application |
 | `database` | Database URL (CouchDB) or location on disk (LevelDB) |
 | `tokens` | (optional) Array of authorized bearer tokens |
 | `labProxy.url`, `labProxy.key` | (optional) Lab proxy URL and access token |
 | `virtualbox.url`, `virtualbox.key` | (optional) [VirtualBox API service](https://github.com/keijokapp/i-tee-virtualbox) URL and access token (optional) |
 | `remote` | (optional) [Remote console application](https://github.com/keijokapp/lab-remote) URL |
 | `repositories` | (optional) Directory where Git repositories are located |
 | `lxd.url`, `lxd.certificate`, `lxd.key` | (optional) LXD URL prefix, TLS certificate and key |
 | `iTee.url`, `iTee.key` | (optional) I-Tee URL prefix and access token (not needed for import feature) for lab instance import and I-Tee compatibility layer |

### Installing as Systemd service:
```
useradd -d /var/lib/lab-manager -s /bin/false -r lab-manager
[ -e /etc/lab-manager/config.json ] || \
    install -D -m640 --group=lab-manager "$(npm root -g)/lab-manager/config_sample.json" \
    /etc/lab-manager/config.json
install -D "$(npm root -g)/lab-manager/lab-manager.service" \
    /usr/local/lib/systemd/system/lab-manager.service
systemctl daemon-reload
systemctl enable lab-manager
systemctl start lab-manager
```

# Overview

## API documentaiton

Application serves OpenAPI document at pathname `/openapi.json`. This document can be plugged into existing Swagger UI instance, e.g. [https://petstore.swagger.io/?url=http://localhost:3000/openapi.json](https://petstore.swagger.io/?url=http://localhost:3000/openapi.json).

## Authentication and authorization

Lab manager does not have concept of *users* and therefore does not provide authentication. However, if bearer tokens are configured, application uses these in authorization process as described in [RFC6750](https://tools.ietf.org/html/rfc6750). Instance endpoints accessed by instance tokens are not explicitly authorized. I-Tee compatibility layer uses its own request format to provide authorization token.

## I-Tee compatibility

Lab manager provides few endpoints which emulate some behaviour of I-Tee API. This layer currently needs actual I-Tee instance to manage users and keep track of lab ID-s.

Take a look at [lib/routes/i-tee-compat.js](lib/routes/i-tee-compat.js) for details.

## Data structures

Lab manager essentially stores two types of documents:
 * `lab` - document describing the lab identified by lab name. Its contents include lab-specific configuration of modules (machines, lab proxy, repositories, etc...). These documents are stateless on their own and can be modified via ETag-supported/transactional UI. Its schema is defined in [lib/routes/lab.js](lib/routes/lab.js).
 * `instance` - document describing a *running* lab instance identified by lab name and username (semi-arbitrary string specified by client). This object is created by application by starting the lab is not changed once created. Its schema is not strictly defined, but generally for every module specified by lab object, there's a property in instance object. It embeds lab object upon creation and does not depend on original lab object.

Both of these objects must not contain "phantom" properties. E.g. if lab does not have any endpoints, it must not have endpoints property.

I-Tee API compatibility layer creates another type of objects - `i-tee-compat` - objects representing virtual unstarted lab instances identified by lab name and username. This is essentially needed to map between integer lab/user/instace ID-s (as used by I-Tee) and lab-/username. This can coexists with corresponding instance object in which case the instance object takes precedence and this object is entirely ignored.

## Instance tokens

Each lab instance has two unique unpredictable tokens (UUIDv4-s currently):
 * Private token - provides access to full instance object and features like machine state reading and control, repositories etc. This token should not be exposed to any untrusted party as it enables compromising sensitive data and systems.
 * Public token - provides access only to features directed to lab users like reading carefully whitelisted information of lab, machines, GitLab etc. This token can be exposed to user.

Whenever request is made with unknown token and I-Tee integration is configured, lab manager tries to seamlessly import instance from I-Tee. That way, features provided by lab manager (e.g. repositories) can be used even if lab runs on I-Tee. Lab definition in both lab manager and I-Tee must be strictly compatible, otherwise the import fails.

## VirtualBox

Support for VirtualBox virtual machines is done with [i-tee-virtualbox](https://github.com/keijokapp/i-tee-virtualbox) REST API. Virtual machines with name ending with `-template` are considered "templates" and can be used as base machines in labs. When lab is started, either a full clone (if template does not have snapshots) or a linked clone (if it has) is created and attached to instance. VirtualBox machines support both VirtualBox internal and bridged networks.

## LXD

Lab manager can communicate directly with LXD via TLS REST API. From a user perspective, it behaves similarly to virtual machines except that there is no support for visual remote console and some other features which do not make sense in container environment.

In LXD context, templates are LXD images with name ending with `-template`. This concept might change in the future. LXD only supports bridged networks.

There is no low-level LXD management UI as LXD has done pretty decent job to provite it itself.

## GitLab support

Lab manager can create GitLab user and group for each lab instance. This makes it easier to provide user with convenient interface to browse and modify source code of targets or other software used in lab.

## Git repositories

Git repositories are bare/mirror repositories in directory specified by `repositories` configuration option. Repositories must be writable by application for fetching to work and their directory names must end with `.git`. Lab manager currently does not support adding new repositories from web/API interface.

Labs can be granted read-only access to repository via instance private token.

# Tests

There are currently no automated tests as the software is still in proof of concept phase. This will change and I will try to accomplish and maintain full coverage of REST API-s.

# Licence

MIT


