require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase credentials missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const COLLECTIONS = ['players','clubs','academies','agents','trainers','marketers','admins','employees','users'];
const targetPhone = '01017799580'; // Egyptian format entered by user

function buildVariants(phone){
  const clean = phone.replace(/^0+/,'').replace(/\s+/g,'').replace(/\D/g,'');
  const variants = new Set([phone.trim(), clean, `+${clean}`]);
  if (clean.startsWith('20')) {
    const local = clean.substring(2);
    variants.add(local);
    variants.add('0'+local);
  } else if (phone.startsWith('01') && clean.length===11) {
    variants.add(`20${clean.substring(1)}`);
    variants.add(clean.substring(1));
  }
  if (clean.startsWith('966')) {
    const local = clean.substring(3);
    variants.add(local);
    variants.add('0'+local);
  } else if (phone.startsWith('05') && clean.length===10) {
    variants.add(`966${clean.substring(1)}`);
    variants.add(clean.substring(1));
  }
  if (clean.length>7) {
    variants.add(clean);
    if (!clean.startsWith('+')) variants.add(`+${clean}`);
  }
  return Array.from(variants).filter(v=>v.length>=8);
}

async function search(){
  const variants = buildVariants(targetPhone);
  console.log('Searching for variants:', variants);
  for (const coll of COLLECTIONS){
    try{
      const {data,error}=await supabase.from(coll).select('id,phone,email,full_name,name,accountType').or(variants.map(v=>`phone.eq."${v}"`).join(','));
      if(error){
        if(error.code!=='42P01') console.error('Error in',coll,error.message);
        continue;
      }
      if(data && data.length){
        console.log('FOUND in',coll, data);
      }
    }catch(e){
      console.error('Exception in',coll,e.message);
    }
  }
  // Auth users
  try{
    const {data:{users},error}=await supabase.auth.admin.listUsers();
    if(error){console.error('Auth list error',error.message);return;}
    const found = users.filter(u=>{
      const p = u.phone||u.user_metadata?.phone||u.user_metadata?.phoneNumber||'';
      return variants.some(v=>p.includes(v));
    });
    if(found.length) console.log('FOUND in Auth',found.map(u=>({id:u.id,phone:u.phone,email:u.email})));
    else console.log('Not found in Auth');
  }catch(e){console.error('Auth error',e.message);}
}

search();
