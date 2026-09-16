import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Ajv from 'ajv';

for (const [kind, source] of [['elements', '../../catalog-service/Element.Services.Element.Infrastructure/Data/'], ['compounds', '../../compound-service/Element.Services.Compound.Infrastructure/Data/']]) {
  test(`Published ${kind} schema validates full records and rejects malformed identity`, () => {
    const schema = JSON.parse(readFileSync(new URL(`../public/schema/${kind}.schema.json`, import.meta.url), 'utf8'));
    const records = JSON.parse(readFileSync(new URL(`${source}scientific-${kind}.json`, import.meta.url), 'utf8'));
    const validate = new Ajv({ strict: false }).compile(schema);
    for (const record of records) assert.ok(validate(record), JSON.stringify(validate.errors));
    const invalid = { ...records[0], names: 42 };
    assert.equal(validate(invalid), false);
    const absent = { ...records[0] }; delete absent.id;
    assert.equal(validate(absent), false);
  });
}
