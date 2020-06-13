const test = require('ava');
const { validateTiddler } = require('../src/schema.js');

test('good tiddler', t => {
  const tiddler = {
        "text": "aaa",
        "type": "text/vnd.tiddlywiki",
        "title": "some/path/TestTiddler",
        "bag": "user:neumark.peter@gmail.com",
        "modifier": "neumark.peter@gmail.com",
        "creator": "neumark.peter@gmail.com",
        "created": "20200607100221517",
        "modified": "20200608125809299",
        "revision": "20200608125809299:neumark.peter@gmail.com"
    };
  t.deepEqual(validateTiddler(tiddler), {valid: true, errors: null}, "valid tiddler passes");
});

test('bad tiddler (missing title)', t => {
  const tiddler = {
        "text": "aaa",
        "type": "text/vnd.tiddlywiki",
        "bag": "user:neumark.peter@gmail.com",
        "modifier": "neumark.peter@gmail.com",
        "creator": "neumark.peter@gmail.com",
        "created": "20200607100221517",
        "modified": "20200608125809299",
        "revision": "20200608125809299:neumark.peter@gmail.com"
    };
  t.deepEqual(validateTiddler(tiddler), {valid: false, errors: [{
    dataPath: '',
    keyword: 'required',
    message: 'should have required property \'title\'',
    params: {missingProperty: 'title'},
    schemaPath: '#/required',
  }]}, "bad tiddler produces validation errors");
});
