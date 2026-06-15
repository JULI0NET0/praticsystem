import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

const idMapping = {
  10: "028fb1ed-18cb-4ddf-bd83-9b6013294de0", // CAvezzo
  11: "51c4871c-b8aa-4a95-8643-9315c35a141d", // Balloarts
  12: "cba41020-846c-4c1f-a1fa-dae96a4f8c4a", // Luane
  13: "ca6823f2-3564-4056-be54-3e1c9abf58c1", // BeEpic
  14: "b2f531fd-23cb-4487-a332-8737401d710a"  // Cold Joias
};

async function update() {
  for (const [seqId, id] of Object.entries(idMapping)) {
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
