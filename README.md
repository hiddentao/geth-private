# geth-private

[![Build Status](https://secure.travis-ci.org/hiddentao/geth-private.png?branch=master)](http://travis-ci.org/hiddentao/geth-private) [![NPM module](https://badge.fury.io/js/geth-private.png)](https://badge.fury.io/js/geth-private) [![Follow on Twitter](https://img.shields.io/twitter/url/http/shields.io.svg?style=social&label=Follow&maxAge=2592000)](https://twitter.com/hiddentao)

Quickly setup a local, private Ethereum blockchain.

Features:

* Programmatic as well as command-line interface
* Automatically enables IPC and RPC/CORS access
* Override all options passed to the `geth` executable.
* Execute console commands against the running geth instance.
* Logging capture
* Works with [Mist wallet](https://github.com/ethereum/mist)

## Requirements:

* Node.js v4 or above
* [Geth 1.8+](https://github.com/ethereum/go-ethereum)

## Installation

I recommend installing geth-private as a global module so that the CLI becomes
available in your PATH:

```bash
$ npm install -g geth-private
```

## Usage

### via command-line

**Quickstart**

```bash
$ geth-private
```

You should see something like:

```bash
geth is now running (pid: 2428).

Etherbase:  8864324ac84c3b6c507591dfabeffdc1ad02e09b
Data folder:  /var/folders/br6x6mlx113235/T/tmp-242211yX

To attach:  geth attach ipc:///var/folders/br6x6mlx113235/T/tmp-242211yX/geth.ipc
```

*Note: geth-private runs Geth on port 60303 (and HTTP RPC on port 58545) by default with networkid 33333*

Run the `attach` command given to attach a console to this running geth
instance. By default [web3](https://github.com/ethereum/web3.js) RPC is also
enabled on port 58545.

Once it's running launch the Ethereum/Mist wallet with the `--rpc http://localhost:58545` CLI option - it should be able to
connect to your geth instance.


**Options**

```
Usage: geth-private [options]

Options:
  --gethPath      Path to geth executable to use instead of default
  -v              Verbose logging
  -h, --help      Show help                                                [boolean]
  --version       Output version.

All other options get passed onto the geth executable.
```

You can also pass options directly to geth. For example, you can customize
network identity, port, etc:

```bash
$ geth-private --port 10023 --networkid 54234 --identity testnetwork
```

By default geth-private stores its keystore and blockchain data inside a
temporarily generated folder, which gets automatically deleted once it exits.
You can override this behaviour by providing a custom location using the
`datadir` option:

```bash
$ geth-private --datadir /path/to/data/folder
```

When geth-private exits it won't auto-delete this data folder since you
manually specified it. This allows you to re-use once created keys and
accounts easily.


### via API


```js
var geth = require('geth-private');

var inst = geth();

inst.start()
  .then(function() {
    // do some work
  });
  .then(function() {
    // stop it
    return inst.stop();
  });
  .catch(function(err) {
    console.error(err);
  })

```

Same as for the CLI, you can customize it by passing options during construction:

```js
var geth = require('geth-private');

var inst = geth({
  balance: 10,
  gethPath: '/path/to/geth',
  verbose: true,
  gethOptions: {
    /*
      These options get passed to the geth command-line

      e.g.

      mine: true
      rpc: false,
      identity: 'testnetwork123'
    */
  },
});

inst.start().then(...);
```

You can execute web3 commands against the running geth instance:

```js
var inst = geth();

inst.start()
  .then(() => {
    return inst.consoleExec('web3.version.api');
  })
  .then((version) => {
    console.log(version);
  })
  ...
```

### Mining

To start and stop mining:

```js
var inst = geth();

inst.start()
  .then(() => {
    return inst.consoleExec('miner.start()');
  })
  ...
  .then(() => {
    return inst.consoleExec('miner.stop()');
  })
  ...
```

If you've never mined before then Geth will first generate a [DAG](https://github.com/ethereum/wiki/wiki/Ethash-DAG), which
could take a while. Use the `-v` option to Geth's logging.



## Logging capture

When using the programmatic API you can capture all output logging by passing
a custom logging object:

```js
var inst = geth({
  verbose: true,
  logger: {
    debug: function() {...},
    info: function() {...},
    error: function() {...}
  }
});

inst.start();
```


## Development

To run the tests:

```bash
$ npm install
$ npm test
```

## Contributions

Contributions are welcome. Please see CONTRIBUTING.md.


## License

MIT
