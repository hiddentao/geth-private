# geth-private

Quickly setup a local, private Ethereum blockchain. 

Features:

* Programmatic as well as command-line interface
* Automatically enables IPC and RPC/CORS access
* Customizable - specify starting accounts, passwords, balances, folders, etc.
* Works with [Mist wallet](https://github.com/ethereum/mist)

_Thanks to [Ade Duke](http://adeduke.com/2015/08/how-to-create-a-private-ethereum-chain/)_

## Installation

For both command-line and programmatic usage:

```bash
$ npm install -g geth-private
```

## Usage

### via command-line

Quickstart:

```bash
$ geth-private
```

You can customize it with options:

_TODO..._

### via module


```js
var geth = require('geth-private');

geth.start()
  .then(function(childProcess) {
    // childProcess is node.js ChildProcess instance,
    // you can call all the usual methods on it.
  });
  .catch(function(err) {
    console.error(err);  
  })

```

You can customize it by passing options to `start()`:

_TODO..._

## Contributions

Contributions are welcome. Please see CONTRIBUTING.md.


## License

MIT

