/* eslint-env mocha */
'use strict'

var expect = require('chai').expect
var sinon = require('sinon')
var mockery = require('mockery')

var vinylFs = require('vinyl-fs')
var actualToposort = require('toposort')
var actualUtil = require('../../lib/util.js')
// var actualFs = require('fs')

var sandbox = sinon.sandbox.create()
var git = {
  add: sandbox.stub(),
  commit: sandbox.stub(),
  exec: sandbox.stub(),
  revParse: sandbox.stub(),
  status: sandbox.stub(),
  tag: sandbox.stub()
}
var fs = {
  readFile: sandbox.stub(),
  stat: sandbox.stub()
}
var util = {
  readJson: sandbox.stub(),
  writeJson: sandbox.stub(),
  formatJson: sandbox.spy(actualUtil, 'formatJson')
}
var vfs = { src: sandbox.stub() }
var toposort = sandbox.stub() // sinon.spy(require('toposort'))

var project

describe('lib/project', function() {
  before(function() {
    mockery.enable()
  })

  beforeEach(function() {
    mockery.registerMock('gulp-git', git)
    mockery.registerMock('vinyl-fs', vfs)
    mockery.registerMock('fs', fs)
    mockery.registerMock('toposort', toposort)
    mockery.registerMock('./util.js', util)

    mockery.warnOnUnregistered(false)
    // mockery.registerAllowables([
    //   'lodash',
    //   'jszip',
    //   'concat-stream',
    //   'async',
    //   'lodash',
    //   'path',
    //   'slash'
    // ])

    mockery.registerAllowable('../../lib/project.js', true)

    project = require('../../lib/project.js')
  })

  afterEach(function() {
    sandbox.reset()
    mockery.deregisterAll()
  })

  after(function() {
    mockery.disable()
  })

  it('should exist', function() {
    expect(project).to.not.be.undefined
    expect(Object.keys(project).length).to.be.ok
  })

  it('should get config', function() {
    project.getConfig(null)
    expect(util.readJson.calledOnce).to.be.true

    var args = util.readJson.args[0]
    expect(args[0]).to.equal('mlpm.json')
  })

  it('should save config', function() {
    var data = { prop: 'val' }
    project.saveConfig(data, null)
    expect(util.writeJson.calledOnce).to.be.true

    var args = util.writeJson.args[0]
    expect(args[0]).to.equal('mlpm.json')
    expect(args[1]).to.equal(data)
  })

  it('should invoke getRepository callback on error', function(done) {
    git.exec.yieldsAsync(new Error('bad repo'))

    project.getRepository(function(err, repo) {
      expect(err).to.match(/bad repo/)
      done()
    })
  })

  it('should get repository URL', function(done) {
    git.exec.onCall(0).yieldsAsync(null, 'git@github.com:joemfb/mlpm.git')
    git.exec.onCall(1).yieldsAsync(null, 'git@bitbucket.com:user/repo.git')

    project.getRepository(function(err, repo) {
      expect(repo).to.equal('https://github.com/joemfb/mlpm.git')

      project.getRepository(function(err, repo) {
        expect(repo).to.equal('git@bitbucket.com:user/repo.git')
        done()
      })
    })
  })

  it('should get HEAD commit', function(done) {
    git.revParse.yieldsAsync(null, 'ef21b08e714320edd49d1104b0b14c6771517b62')

    project.getHeadCommit(function(err, commit) {
      if (err) return done(err)

      expect(commit).to.equal('ef21b08e714320edd49d1104b0b14c6771517b62')
      done()
    })
  })

  it('should invoke getRepoStatus callback on error', function(done) {
    git.status.yieldsAsync(new Error('bad repo'))

    project.getRepoStatus(function(err, repo) {
      expect(err).to.match(/bad repo/)
      done()
    })
  })

  it('should get repo status', function(done) {
    git.status.yieldsAsync(null, [' M package.json', '?? tmp.js'].join('\n'))

    project.getRepoStatus(function(err, changes) {
      if (err) return done(err)

      expect(changes.length).to.be.ok
      expect(changes[0]).to.equal('M package.json')
      done()
    })
  })

  // ick
  // need to figure out how to pipe a tream through the gulp git mock

  // it('should commit config', function(done) {
  //   var stream = new require('stream')
  //   var Readable = require('stream').Readable

  //   var rs1 = new Readable
  //   var rs2 = new Readable
  //   rs1.push(null)
  //   rs2.push(null)

  //   vfs.src.returns( vinylFs.src('./test/fixtures/mlpm.json') )
  //   git.add.returns(rs1)
  //   git.commit.returns(rs2)

  //   // vfs.src('./test/fixtures/mlpm.json')
  //   // .on('data', function(){
  //   //   console.log(arguments)
  //   // done()
  //   // })

  //   project.commitConfig(function(err) {
  //     if (err) return done(err)

  //     expect(git.add.calledOnce).to.be.true
  //     var args = git.add.args
  //     console.log(args)

  //     expect(git.commit.calledOnce).to.be.true
  //     args = git.commit.args
  //     console.log(args)

  //     done()
  //   })
  // })

  it('should tag repo', function() {
    project.tagRepo('v1.0.0')
    expect(git.tag.calledOnce).to.be.true

    var args = git.tag.args[0]
    expect(args[0]).to.equal('v1.0.0')
    expect(args[1]).to.equal('v1.0.0')
  })

  it('should tag repo with a correct version', function() {
    project.tagRepo('1.0.0')
    expect(git.tag.calledOnce).to.be.true

    var args = git.tag.args[0]
    expect(args[0]).to.equal('v1.0.0')
    expect(args[1]).to.equal('v1.0.0')
  })

  it('should get default project config', function(done) {
    project.getDefaultConfig(null, function(err, config) {
      expect(config.name).to.equal('mlpm')
      expect(config.repository).to.equal('https://github.com/joemfb/mlpm.git')
      expect(config.version).to.equal('1.0.0')
      done()
    })
  })

  it('should return existing project config', function(done) {
    var pkgConfig = {
      name: 'blah',
      repository: 'example.com',
      version: '2.1.3',
      description: 'my-awesome-project',
      prop: 'val'
    }

    project.getDefaultConfig(pkgConfig, function(err, config) {
      expect(config.name).to.equal('blah')
      expect(config.repository).to.equal('example.com')
      expect(config.version).to.equal('2.1.3')
      expect(config.description).to.equal('my-awesome-project')
      expect(config.prop).to.be.undefined
      done()
    })
  })

  it('should save dependency info', function() {
    var pkgConfig = {
      name: 'blah',
      repository: 'example.com',
      version: '2.1.3',
      description: 'my-awesome-project'
    }

    project.saveDependency(pkgConfig, 'foo', '~1.1.0', null)
    expect(util.writeJson.calledOnce).to.be.true

    var args = util.writeJson.args[0]
    expect(args[1].dependencies).to.not.be.undefined
    expect(args[1].dependencies.foo).to.equal('~1.1.0')

    util.writeJson.reset()

    project.saveDependency(pkgConfig, 'foo', '1.1.3', null)
    expect(util.writeJson.calledOnce).to.be.true

    args = util.writeJson.args[0]
    expect(args[1].dependencies).to.not.be.undefined
    expect(args[1].dependencies.foo).to.equal('1.1.*')
  })

  it('should delete dependency info', function() {
    var pkgConfig = {
      name: 'blah',
      repository: 'example.com',
      version: '2.1.3',
      description: 'my-awesome-project',
      dependencies: { foo: '~1.1.0' }
    }

    project.deleteDependency(pkgConfig, 'foo', null)
    expect(util.writeJson.calledOnce).to.be.true

    var args = util.writeJson.args[0]
    expect(args[1].dependencies).to.not.be.undefined
    expect(args[1].dependencies.foo).to.be.undefined
  })

  it('should sort packages', function() {
    var packages = [
      {
        name: 'bar',
        repository: 'example.com',
        version: '1.1.2',
        description: 'my-awesome-project',
        dependencies: { foo: '~3.2.0' }
      },
      {
        name: 'blah',
        repository: 'example.com',
        version: '2.1.3',
        description: 'my-awesome-project'
      },
      {
        name: 'foo',
        repository: 'example.com',
        version: '3.2.4',
        description: 'my-awesome-project',
        dependencies: { blah: '~2.1.0' }
      }
    ]

    toposort.returns(['blah', 'bar', 'foo'])

    var result = project.sortPackages(packages)

    expect(toposort.calledOnce).to.be.true
    expect(result[0].name).to.equal('blah')
    expect(result[1].name).to.equal('bar')
    expect(result[2].name).to.equal('foo')
  })

  it('should get packages config', function(done) {
    vfs.src.returns( vinylFs.src('./test/fixtures/**/mlpm.json') )

    // need to actually sort
    toposort = sinon.spy(actualToposort)

    project.getPackages(function(err, packages) {
      if (err) return done(err)

      expect(packages).not.to.be.undefined
      expect(packages.length).to.equal(2)
      expect(packages[0].name).to.equal('cts-extensions')
      expect(packages[1].name).to.equal('group-by')

      toposort = sandbox.stub()
      done()
    })
  })

  it('should get ignore globs', function(done) {
    fs.readFile.onCall(0).yieldsAsync(null, 'foo')
    fs.readFile.onCall(1).yieldsAsync(null, 'bar')

    project.getIgnoreGlobs(function(err, globs) {
      expect(globs[0]).to.equal('!mlpm.json')
      expect(globs[globs.length - 1]).to.equal('!bar')
      expect(globs[globs.length - 2]).to.equal('!foo')
      expect(globs[globs.length - 3]).to.equal('!src/xray')
      done()
    })
  })

  it('should get ignore globs if files doen\'t exist', function(done) {
    fs.readFile.onCall(0).yieldsAsync(new Error('error1'))
    fs.readFile.onCall(1).yieldsAsync(new Error('error2'))

    project.getIgnoreGlobs(function(err, globs) {
      expect(globs[0]).to.equal('!mlpm.json')
      expect(globs[globs.length - 1]).to.equal('!src/xray')
      done()
    })
  })

  it('should get globs', function(done) {
    var pkgConfig = {
      name: 'blah',
      repository: 'example.com',
      version: '2.1.3',
      description: 'my-awesome-project'
    }

    project.getGlobs(pkgConfig, function(err, globs) {
      expect(globs[0]).to.equal('*')
      expect(globs[globs.length - 1]).to.equal('!src/xray')
      done()
    })
  })

  it('should get globs from pkgConfig files array', function(done) {
    var pkgConfig = {
      name: 'blah',
      repository: 'example.com',
      version: '2.1.3',
      description: 'my-awesome-project',
      files: [
        'src/foo.sjs',
        'src/lib'
      ]
    }

    var stub = sandbox.stub()
    fs.stat.yieldsAsync(null, { isDirectory: stub })
    stub.onCall(0).returns(false)
    stub.onCall(1).returns(true)

    project.getGlobs(pkgConfig, function(err, globs) {
      expect(globs[4]).to.equal('src/foo.sjs')
      expect(globs[5]).to.equal('src/lib/**/*')
      done()
    })
  })

  it('should invoke getGlobs callback on error', function(done) {
    var pkgConfig = {
      name: 'blah',
      repository: 'example.com',
      version: '2.1.3',
      description: 'my-awesome-project',
      files: [
        'src/foo.sjs',
        'zzz/q'
      ]
    }

    var stub = sandbox.stub().returns(false)
    fs.stat.onCall(0).yieldsAsync(null, { isDirectory: stub })
    fs.stat.onCall(1).yieldsAsync(new Error('bad'))

    project.getGlobs(pkgConfig, function(err, globs) {
      expect(err).to.match(/bad/)
      done()
    })
  })

  it('should get files', function(done) {
    var pkgConfig = {
      name: 'blah',
      repository: 'example.com',
      version: '2.1.3',
      description: 'my-awesome-project'
    }

    vfs.src.returns( vinylFs.src('test/fixtures/files/*') )

    project.getFiles(pkgConfig, function(err, files) {
      expect(vfs.src.calledOnce).to.be.true
      expect(files.length).to.equal(2)
      expect(files[0].stat.isFile()).to.be.true
      expect(files[1].stat.isFile()).to.be.true
      done()
    })
  })

  it('should invoke getFiles callback with error', function(done) {
    var pkgConfig = {
      name: 'blah',
      repository: 'example.com',
      version: '2.1.3',
      description: 'my-awesome-project',
      files: [
        'src/foo.sjs',
        'zzz/q'
      ]
    }

    vfs.src.returns( vinylFs.src('test/fixtures/files/*') )

    fs.stat = sandbox.stub().yieldsAsync(new Error('bad'))

    project.getFiles(pkgConfig, false, function(err, files) {
      expect(err).to.match(/bad/)
      done()
    })
  })

  it('should create zip', function(done) {
    var pkgConfig = {
      name: 'blah',
      repository: 'example.com',
      version: '2.1.3',
      description: 'my-awesome-project'
    }

    vfs.src.returns( vinylFs.src('test/fixtures/files/*') )

    project.createZip(pkgConfig, function(err, zip) {
      expect(vfs.src.calledOnce).to.be.true
      expect( Object.keys(zip.files).length ).to.equal(3)
      expect(zip.files['mlpm.json']).not.to.be.undefined
      expect(JSON.parse(zip.file('mlpm.json').asText()).gitHead).not.to.be.undefined
      expect(zip.files['test/fixtures/files/test.sjs']).not.to.be.undefined
      expect(zip.files['test/fixtures/files/test.xqy']).not.to.be.undefined
      done()
    })
  })

  it('should invoke createZip callback with getFiles error', function(done) {
    var pkgConfig = {
      name: 'blah',
      repository: 'example.com',
      version: '2.1.3',
      description: 'my-awesome-project',
      files: [ 'mlpm.json' ]
    }

    fs.stat = sandbox.stub().yieldsAsync(new Error('bad files'))

    project.createZip(pkgConfig, function(err, zip) {
      expect(err).to.match(/bad files/)
      done()
    })
  })

  it('should skip gitHead in createZip on getHeadCommit error', function(done) {
    var pkgConfig = {
      name: 'blah',
      repository: 'example.com',
      version: '2.1.3',
      description: 'my-awesome-project'
    }

    git.revParse.yieldsAsync(new Error('bad repo'))

    project.createZip(pkgConfig, function(err, zip) {
      expect(vfs.src.calledOnce).to.be.true
      expect(JSON.parse(zip.file('mlpm.json').asText()).gitHead).to.be.undefined
      done()
    })
  })

})
