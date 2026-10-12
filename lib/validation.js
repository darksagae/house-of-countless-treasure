export function validate(schema, value, path='parameters') {
 const errors=[];
 if(value===null&&schema.nullable)return errors;
 for(const sub of schema.allOf||[]) errors.push(...validate(sub,value,path));
 for(const key of ['anyOf','oneOf']) if(schema[key]?.length&&!schema[key].some(s=>validate(s,value,path).length===0))errors.push(`${path}: choose a valid input combination.`);
 if(schema.enum&&!schema.enum.includes(value))errors.push(`${path}: choose one of ${schema.enum.join(', ')}.`);
 const type=schema.type;
 if(type==='object') {
  if(!value||typeof value!=='object'||Array.isArray(value))return [`${path}: expected an object.`];
  for(const key of schema.required||[]) if(value[key]===undefined||value[key]==='')errors.push(`${path}.${key}: required.`);
  for(const [key,sub] of Object.entries(schema.properties||{}))if(value[key]!==undefined)errors.push(...validate(sub,value[key],`${path}.${key}`));
 } else if(type==='array') {
  if(!Array.isArray(value))return [`${path}: expected an array.`];
  if(schema.minItems!==undefined&&value.length<schema.minItems)errors.push(`${path}: needs at least ${schema.minItems} items.`);
  if(schema.maxItems!==undefined&&value.length>schema.maxItems)errors.push(`${path}: too many items.`);
  value.forEach((x,i)=>errors.push(...validate(schema.items||{},x,`${path}[${i}]`)));
 } else if(type==='string') {
  if(typeof value!=='string')return [`${path}: expected text.`];
  if(schema.maxLength!==undefined&&value.length>schema.maxLength)errors.push(`${path}: exceeds ${schema.maxLength} characters.`);
  if(schema.minLength!==undefined&&value.length<schema.minLength)errors.push(`${path}: too short.`);
 } else if(type==='number'||type==='integer') {
  if(typeof value!=='number'||!Number.isFinite(value)||(type==='integer'&&!Number.isInteger(value)))return [`${path}: expected ${type}.`];
  if(schema.minimum!==undefined&&value<schema.minimum)errors.push(`${path}: below minimum ${schema.minimum}.`);
  if(schema.maximum!==undefined&&value>schema.maximum)errors.push(`${path}: above maximum ${schema.maximum}.`);
 } else if(type==='boolean'&&typeof value!=='boolean')errors.push(`${path}: expected true or false.`);
 return [...new Set(errors)];
}
