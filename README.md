##### mlpm

node command-line client for mlpm (a MarkLogic package manager)

Install from npm: `npm install -g mlpm`

##### usage

- `mlpm search $QUERY`: search for packages matching `$QUERY`
- `mlpm info $NAME`: view metadata for package `$NAME`
- `mlpm install $NAME`: install package `$NAME`
- `mlpm uninstall $NAME`: uninstall package `$NAME`
- `mlpm ls`: list installed packages
- `mlpm init`: create a new package
- `mlpm publish`: publish a package to the registry
- `mlpm unpublish`: remove a package from the registry
- `mlpm <cmd> -h`: command help
- `mlpm -h`: general help

To publish/unpublish packages, register at http://registry.demo.marklogic.com/ with your github account, then run `mlpm login` with your API token.

##### deployment

mlpm is optimized for the MarkLogic REST API; here's how you deploy installed packages to a REST API instance:

    mlpm deploy -u <user> -p <password> -H <host> -P <port>

TODO: Privileges?

Some applications are developed across multiple environments, and the [Roxy](https://github.com/marklogic/roxy) deployer has great multi-environment support. To integrate mlpm deployment with Roxy, add the following to <code>deploy/app_specific.rb</code>:

```ruby
def deploy_packages
  system %Q!mlpm deploy -u #{ @properties['ml.user'] } \
                        -p #{ @properties['ml.password'] } \
                        -H #{ @properties['ml.server'] } \
                        -P #{ @properties['ml.app-port'] }!
end
```

Now you can run

    ./ml <env> deploy_packages

##### style

comma-first, asi. *Come at me, bro!*

##### license

- Copyright (c) 2014 Joseph Bryan. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

[http://www.apache.org/licenses/LICENSE-2.0]
(http://www.apache.org/licenses/LICENSE-2.0)

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

The use of the Apache License does not indicate that this project is
affiliated with the Apache Software Foundation.
