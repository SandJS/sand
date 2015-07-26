# Sand JS

### What is Sand? 
Sand is a lightweight, all-purpose Javascript application framework. Sand provides a simple, yet robust, application lifecycle and many pluggable clients and libraries. A Sand application loads only the clients and libraries that it requires to do its job, allowing the application to be as simple as possible.

### Why Sand?
In 3 words, **Sand is simple**.

You can create **ANY** kind of Node.js application, script, or service using Sand.

The simplest Sand application is shown below.

```Node.js
var Sand = require('sand');
new Sand().start(function () {
  console.log('Hello, World!');
});
```

Yet, Sand can do a lot more than this.

### Requirements
Currently, Sand is developed on [io.js](https://iojs.org/) using EcmaScript 6. So far, Sand has not been extensively tested on Node.js v0.12, but we expect that it will work there too.

### Show me the code!
See the [examples repository](https://github.com/SandJS/examples).

### Miscellaneous Resources & Gotchas regarding EcmaScript 6
* For a brief description of EcmaScript 6 Features, see [here](https://github.com/lukehoban/es6features).
* For more information on ES6 in io.js, see [here](https://iojs.org/en/es6.html).
* You will notice that many of the source files of Sand require `"use strict"` for compatibility with certain recently added keywords such as `let`, `const`, `class` and others.

### Getting Started
Sand has two components. The Sand core and the Sand Grain. These two components are tied together by the application lifecycle.

#### Sand Core & Application Lifecycle
The core of every Sand application is the [sand](https://www.npmjs.com/package/sand) module.

Sand was built to orchestrate an application's **intitialization**, **startup**, and **shutdown**. These are the three phases in the Sand application lifecycle.

1. The **Initialization** phase loads configuration and prepares the application to receive requests. The function `Sand#init(function() { // ... })` allows you to initialize or preload any resources your app requires before starting.

2. The **Startup** phase starts the application. The `start` event will be fired on application startup. The function `Sand#start(function() { // ... })` starts the application and accepts an optional callback function as an argument. Note that the callback function is called **after** the application starts.

3. The **Shutdown** phase gracefully closes down the application. The `shutdown` event will be fired on application shutdown.

Every application has access to the `sand` global variable which holds references to all the grains that your app has loaded.

#### Sand Grains
A Sand Grain is small piece of functionality required by an application. It is usually a client or library wrapper that autoloads its own configuration and provides convenience functions.

Sand grains have the same three events as the app lifecycle. The Sand core calls the `SandGrain#init` and `SandGrain#shutdown` methods on each sand grain.

A basic sand grain looks like this.

```Node.js
"use strict";

const SandGrain = require('sand-grain');

class Cheese extends SandGrain {

  constructor() {
    super();
    this.name = 'cheese'; // the logging name
    this.configName = 'cheese'; // the name of its configuration file
    this.defaultConfig = {cheese: 'white cheddar'}; // a default config object when no config is specified
    this.version = require('./package').version; // sets the grain's version
  }

  init(config, done) {
    super.init(config); // this must be called

    // configure your grain here
    // `this.config` holds the config object for this grain

    this.log(`I'm initializing! :D`);
    done(); // indicates that this grain is done initializing
  }

  shutdown(done) {
    this.log(`I'm shutting down! :(`);
    // do shutdown stuff here (i.e. close the server gracefully, etc)
    done();
  }

  jusEatinMyCheese() {
    this.log(`Jus' eatin' my ${this.config.cheese}!`);
    return 'ok? ok!';
  }
}

module.exports = Cheese;
```

Every Sand Grain gets loaded onto the `sand` global variable on initialization.