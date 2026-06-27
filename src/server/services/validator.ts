import Ajv from 'ajv';
import schema from '../schemas/canvas.schema.json' assert { type: 'json' };

const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(schema);

export function validateCanvas(data: unknown): string[] | null {
  const valid = validate(data);
  if (valid) return null;
  return validate.errors!.map(e => `${e.instancePath} ${e.message}`);
}
