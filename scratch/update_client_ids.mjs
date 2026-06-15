import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

const idMapping = {
  1: "378cb824-01e7-4459-a404-9d73bb754ff8", // Recloset
  2: "a151d9cc-c759-4ba2-b146-6401432be9b9", // Otica pioneiros
  3: "399eee35-77ca-4d2d-944c-48f7e7df1c12", // Thamires
  4: "196d6f2f-f087-47e7-b8ed-57f9535db5b2", // Looom
  5: "78757950-8280-4d6d-bbcf-9af67011e2a3", // Charlene Reis
  6: null, // unik - not found, we will skip
  7: "9e4c9f5d-b62f-4715-a454-a4413de4b59e", // Instituto de Tricologia
  8: "b33675c8-707c-4a07-8903-ea7410132b84", // Leticia
  9: "184df8d2-acbc-41c6-9ce7-dd8c1beeb713", // Iluminar
  10: "028fb1ed-18cb-4ddf-bd83-9b6013294de0", // CAvezzo
  11: "ca6823f2-3564-4056-be54-3e1c9abf58c1", // BeEpic
  12: "b2f531fd-23cb-4487-a332-8737401d710a"  // Cold Joias
};

async function update() {
  for (const [seqId, id] of Object.entries(idMapping)) {
    if (!id) continue;
    console.log(`Updating ${seqId} -> ${id}`);
    const { error } = await supabase
      .from('clients')
      .update({ sequential_id: Number(seqId) })
      .eq('id', id);
    if (error) console.error("Error:", error);
  }
  console.log("Done");
}

update();
