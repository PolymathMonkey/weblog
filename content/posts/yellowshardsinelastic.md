---
title: "Fixing Yellow Shards in Elasticsearch"
author: ["Dirk"]
date: 2025-11-12T11:07:00+01:00
lastmod: 2025-11-12T11:09:54+01:00
tags: ["forensicwheels"]
draft: false
weight: 1005
---

## Introduction {#introduction}

If you're running Elasticsearch on a single node — like a Raspberry Pi or small lab setup like I am —
you might notice some indices appear with a `yellow` health status.

This show article explains what that means and how to fix it, especially in resource-constrained, **single-node** environments.


## What Does "Yellow" Mean? {#what-does-yellow-mean}

In Elasticsearch:

-   `green`: All primary and replica shards are assigned and active.
-   `yellow`: All primary shards are active, but at least one **replica shard** is unassigned.
-   `red`: At least one **primary shard** is missing → critical!


## Why Yellow Happens on Single Nodes {#why-yellow-happens-on-single-nodes}

In single-node clusters, Elasticsearch cannot assign replica shards (because replicas must be on a different node).
So any index with replicas will **always** be yellow unless:

-   You add more nodes (not ideal on a Raspberry Pi)
-   Or: You disable replicas (`number_of_replicas: 0`)


## Step-by-Step: Diagnose Yellow Shards {#step-by-step-diagnose-yellow-shards}


### 1. List all yellow indices {#1-dot-list-all-yellow-indices}

```sh
GET _cat/indices?v&health=yellow
```


### 2. See why a shard is unassigned {#2-dot-see-why-a-shard-is-unassigned}

```sh
GET _cluster/allocation/explain
```


### 3. Inspect shard assignment of a specific index {#3-dot-inspect-shard-assignment-of-a-specific-index}

```sh
GET _cat/shards/.monitoring-beats-7-2025.08.06?v
```

Example output:

```text
index                              shard prirep state      docs store ip        node
.monitoring-beats-7-2025.08.06     0     p      STARTED    7790 5.9mb 127.0.0.1 mynode
.monitoring-beats-7-2025.08.06     0     r      UNASSIGNED
```

→ The `r` (replica) is unassigned → `yellow` status.


## How to Fix It {#how-to-fix-it}


### A. Fix an individual index {#a-dot-fix-an-individual-index}

Set replicas to zero:

```sh
PUT .monitoring-beats-7-2025.08.06/_settings
{
  "index" : {
    "number_of_replicas" : 0
  }
}
```

This changes the index health from `yellow` to `green`.


### B. Automatically fix all yellow indices {#b-dot-automatically-fix-all-yellow-indices}

If you want to **automate** the fix, use this (Kibana Dev Tools):

```js
GET _cat/indices?health=yellow&format=json
```

Then for each index in the result:

```js
POST <your_index>/_settings
{
  "index": {
    "number_of_replicas": 0
  }
}
```


### C. Prevent future yellow indices {#c-dot-prevent-future-yellow-indices}

Disable replicas by default using an index template:

```json
PUT _template/no-replica-default
{
  "index_patterns": ["*"],
  "settings": {
    "number_of_replicas": 0
  }
}
```

&gt; ⚠️ This applies to **all** future indices. <span class="underline">Only do this in single-node environments</span>.


## Conclusion {#conclusion}

Yellow indices aren't dangerous by default — they just mean you're missing redundancy.
In small environments, it's perfectly safe to run with zero replicas.

Just don't forget to:

-   Monitor your shard health
-   Disable replicas if you only have one node
-   Automate where you can
