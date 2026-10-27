function fail(path, message) {
  return { valid: false, path, message };
}

export function validateSchema(value, schema, path = '$') {
  if (schema.type === 'object') {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      return fail(path, 'Expected an object.');
    }
    for (const key of schema.required ?? []) {
      if (!Object.hasOwn(value, key))
        return fail(`${path}.${key}`, 'Required property is missing.');
    }
    for (const [key, child] of Object.entries(value)) {
      const propertySchema = schema.properties?.[key];
      if (!propertySchema) {
        if (schema.additionalProperties === false)
          return fail(`${path}.${key}`, 'Additional property is not allowed.');
      } else {
        const result = validateSchema(child, propertySchema, `${path}.${key}`);
        if (!result.valid) return result;
      }
    }
    return { valid: true, path, message: 'Object matches the schema.' };
  }
  if (schema.type === 'array') {
    if (!Array.isArray(value)) return fail(path, 'Expected an array.');
    if (schema.maxItems !== undefined && value.length > schema.maxItems)
      return fail(path, `Expected at most ${schema.maxItems} items.`);
    for (const [index, child] of value.entries()) {
      const result = validateSchema(child, schema.items ?? {}, `${path}[${index}]`);
      if (!result.valid) return result;
    }
    return { valid: true, path, message: 'Array matches the schema.' };
  }
  if (schema.type === 'string') {
    if (typeof value !== 'string') return fail(path, 'Expected a string.');
    if (schema.enum && !schema.enum.includes(value))
      return fail(path, 'Value is not in the allowed enum.');
    if (schema.pattern && !new RegExp(schema.pattern).test(value))
      return fail(path, 'String does not match the pattern.');
    return { valid: true, path, message: 'String matches the schema.' };
  }
  if (schema.type === 'number') {
    if (typeof value !== 'number' || !Number.isFinite(value))
      return fail(path, 'Expected a finite number.');
    if (schema.minimum !== undefined && value < schema.minimum)
      return fail(path, `Value is below ${schema.minimum}.`);
    if (schema.maximum !== undefined && value > schema.maximum)
      return fail(path, `Value is above ${schema.maximum}.`);
    return { valid: true, path, message: 'Number matches the schema.' };
  }
  if (schema.type === 'boolean')
    return typeof value === 'boolean'
      ? { valid: true, path, message: 'Boolean matches the schema.' }
      : fail(path, 'Expected a boolean.');
  return { valid: true, path, message: 'No supported constraint at this node.' };
}
