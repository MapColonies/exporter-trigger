import path from 'node:path';
import { expect } from 'vitest';
import jestOpenApi from 'jest-openapi';

// @ts-expect-error -- globalThis.expect is not typed; set temporarily so jest-openapi can call expect.extend
globalThis.expect = expect;

jestOpenApi(path.join(process.cwd(), 'openapi3.yaml'));
