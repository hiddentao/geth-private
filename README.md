# geth-private

Quickly setup a local, private Ethereum blockchain.

Features:

* Programmatic as well as command-line interface
* Automatically enables IPC and RPC/CORS access
* Override all options passed to the `geth` executable.
* Works with [Mist wallet](https://github.com/ethereum/mist)

_Thanks to [Ade Duke](http://adeduke.com/2015/08/how-to-create-a-private-ethereum-chain/) for original how-to._

## Installation

For both command-line and programmatic usage:

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
Data folder:  /var/folders/4v/br6x6mlx113235v1lz39nwfc0000gn/T/tmp-242211yXIVsOX5tP

To attach:  geth attach ipc:///var/folders/4v/br6x6mlx113235v1lz39nwfc0000gn/T/tmp-242211yXIVsOX5tP/
```

Default account balance is 5,000,000 ether - plenty to play around with :)

Run the `attach` command given to attach a console to this running geth 
instance. By default [web3](https://github.com/ethereum/web3.js) RPC is also 
enabled.

One it's running launch Ethereum/Mist wallet as normal - it should be able to 
connect to your geth instance. 


**Options**

```
Usage: geth-private [options]

Options:
  --gethPath  Path to geth executable to use instead of default
  -h, --help  Show help                                                [boolean]
  --version   Output version.

All other options get passed onto the geth executable.
```

For example, you can customize network identity, port, etc:

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
manually specified its. This allows you to re-use once created keys and 
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

Same as for the CLI, you can customize it by passing options to the construction:

```js
var geth = require('geth-private');

var inst = geth({
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
  }
});

inst.start().then(...);
```


## Contributions

Contributions are welcome. Please see CONTRIBUTING.md.


## License

MIT

