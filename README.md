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

Use [this gist](https://gist.github.com/joemfb/c786696f459290e57c73) as your `app_specific.rb` with [Roxy](https://github.com/marklogic/roxy). Then run `./ml <env> deploy_packages`. (TODO: full Roxy integration, see marklogic/roxy#357)

##### style

comma-first, asi. *Come at me, bro!*

##### roadmap

- semver
- TLS
- signed packages

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