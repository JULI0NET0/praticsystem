'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export default function CreateNotaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser, loading } = useAuth();

  useEffect(() => {
    if (loading || !currentUser) return;

    const planId = searchParams.get('plan_id');
    const clientId = searchParams.get('client_id');
    const isScript = searchParams.get('is_script') === 'true' || Boolean(planId);
    const title = searchParams.get('title') || '';

    supabase
      .from('notes')
      .insert({
        user_id: currentUser.id,
        title,
        content: { type: 'doc', content: [{ type: 'paragraph' }] },
        date: new Date().toISOString().split('T')[0],
        subjects: isScript ? ['Roteiro'] : [],
        shared_with: [],
        client_id: clientId || null,
        plan_id: planId || null,
        is_script: isScript,
      })
      .select('id')
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          router.replace(`/admin/notas/${data.id}`);
        }
      });
  }, [currentUser, loading, router, searchParams]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
        <Loader2 size={32} color="var(--accent)" />
      </motion.div>
    </div>
  );
}
