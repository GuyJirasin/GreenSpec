import { analysisSchema } from './schema.mjs';
export function schemaErrors(value,schema=analysisSchema,path='$'){
 const errors=[];const issue=s=>errors.push(`${path}: ${s}`);
 if(schema.const!==undefined&&value!==schema.const)issue('does not equal required constant');
 if(schema.enum&&!schema.enum.includes(value))issue('not in allowed values');
 const type=x=>x===null?'null':Array.isArray(x)?'array':typeof x==='object'?'object':Number.isInteger(x)?'integer':typeof x;
 if(schema.type){const types=Array.isArray(schema.type)?schema.type:[schema.type];const actual=type(value);if(!types.includes(actual)&&!(actual==='integer'&&types.includes('number'))){issue(`expected ${types.join('|')}`);return errors;}}
 if(typeof value==='number'){if(!Number.isFinite(value))issue('must be finite');if(schema.minimum!==undefined&&value<schema.minimum)issue('below minimum');if(schema.exclusiveMinimum!==undefined&&value<=schema.exclusiveMinimum)issue('below exclusive minimum');}
 if(typeof value==='string'&&schema.minLength!==undefined&&value.length<schema.minLength)issue('too short');
 if(Array.isArray(value)){if(schema.minItems!==undefined&&value.length<schema.minItems)issue('too few items');if(schema.maxItems!==undefined&&value.length>schema.maxItems)issue('too many items');if(schema.items)value.forEach((v,i)=>errors.push(...schemaErrors(v,schema.items,`${path}[${i}]`)));}
 if(value!==null&&typeof value==='object'&&!Array.isArray(value)){
  for(const k of schema.required??[])if(!(k in value))issue(`missing ${k}`);
  if(schema.additionalProperties===false)for(const k of Object.keys(value))if(!Object.hasOwn(schema.properties??{},k))issue(`unknown property ${k}`);
  for(const [k,s] of Object.entries(schema.properties??{}))if(k in value)errors.push(...schemaErrors(value[k],s,`${path}.${k}`));
 }
 for(const condition of schema.allOf??[]){if(condition.if){if(!schemaErrors(value,condition.if,path).length&&condition.then)errors.push(...schemaErrors(value,condition.then,path));}else errors.push(...schemaErrors(value,condition,path));}
 return errors;
}
