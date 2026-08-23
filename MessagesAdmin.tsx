import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { Sermon } from '@/types';
import {
  fetchYoutubeMetadata,
  generateSermonAnalysis,
  extractYoutubeId,
  getYoutubeThumbnail,
  cleanSermonTitle,
} from '@/lib/sermonAiService';
import { SermonDetailsModal } from '@/components/shared/SermonDetailsModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Video,
  Sparkles,
  Plus,
  Play,
  Trash2,
  Edit3,
  ExternalLink,
  BookOpen,
  CheckCircle2,
  Globe,
  Search,
  Zap,
  Copy,
  Check,
  RefreshCw,
  Eye,
  Layers,
  FileText,
  Loader2,
  Minimize2,
  X,
  ArrowRight,
  Share2,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatSermonForWhatsApp } from '@/lib/whatsappFormatter';

export interface BackgroundJob {
  id: string; // youtubeId
  youtubeUrl: string;
  youtubeId: string;
  title: string;
  preacher: string;
  thumbnailUrl: string;
  status: 'starting' | 'transcribing' | 'analyzing' | 'saving' | 'completed' | 'error';
  stepMessage: string;
  progress: number;
  error?: string;
  sermonData?: any;
  autoSaved?: boolean;
}

export default function MessagesAdmin() {
  const { profile } = useAuth();
  const [sermons, setSermons] = useState<Sermon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');

  // Input rápido em segundo plano no topo
  const [quickUrlInput, setQuickUrlInput] = useState('');

  // Fila de tarefas em segundo plano
  const [backgroundJobs, setBackgroundJobs] = useState<BackgroundJob[]>([]);

  // Modais
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSermonForView, setSelectedSermonForView] = useState<Sermon | null>(null);
  const [editingSermonId, setEditingSermonId] = useState<string | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Formulário
  const [formData, setFormData] = useState({
    title: '',
    youtube_url: '',
    youtube_id: '',
    thumbnail_url: '',
    preacher: '',
    series_name: '',
    summary: '',
    practical_application: '',
    bible_verses: [] as string[],
    key_quotes: [] as string[],
    transcription: '',
    published_at: new Date().toISOString().split('T')[0],
    published: true,
  });

  const [currentVerseInput, setCurrentVerseInput] = useState('');

  const loadSermons = async () => {
    setIsLoading(true);
    try {
      const data = await api.getSermons(false);
      setSermons(data);
    } catch (e) {
      console.error('Erro ao carregar mensagens:', e);
      toast.error('Não foi possível carregar as pregações.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSermons();
  }, []);

  // Processador Central em Segundo Plano (Headless / Async)
  const startBackgroundJob = async (rawUrl: string, autoSave = false) => {
    const yId = extractYoutubeId(rawUrl);
    if (!yId) {
      toast.error('Link do YouTube inválido. Exemplo: https://youtu.be/RZqEcqsHElQ');
      return;
    }

    const standardUrl = `https://www.youtube.com/watch?v=${yId}`;
    const thumb = getYoutubeThumbnail(yId);

    // Cria/atualiza o Job na fila
    const newJob: BackgroundJob = {
      id: yId,
      youtubeId: yId,
      youtubeUrl: standardUrl,
      title: 'Identificando pregação...',
      preacher: '',
      thumbnailUrl: thumb,
      status: 'starting',
      stepMessage: 'Iniciando extração do vídeo...',
      progress: 15,
      autoSaved: autoSave,
    };

    setBackgroundJobs((prev) => [newJob, ...prev.filter((j) => j.id !== yId)]);
    toast.info('🚀 Processamento em segundo plano iniciado! Você pode continuar usando o painel.');

    try {
      // 1. Metadados do Vídeo
      let previewTitle = 'Culto de Celebração';
      let previewPreacher = '';
      let publishedDateStr = new Date().toISOString().split('T')[0];

      try {
        const meta = await fetchYoutubeMetadata(standardUrl);
        if (meta?.rawTitle) {
          const { title: pTitle, preacher: pPreacher, isoDate } = cleanSermonTitle(meta.rawTitle);
          previewTitle = pTitle || meta.rawTitle;
          previewPreacher = pPreacher;
          if (isoDate) publishedDateStr = isoDate.split('T')[0];
        }
      } catch (_e) {}

      setBackgroundJobs((prev) =>
        prev.map((j) =>
          j.id === yId
            ? {
                ...j,
                title: previewTitle,
                preacher: previewPreacher,
                status: 'transcribing',
                stepMessage: 'Baixando transcrição do áudio com IA...',
                progress: 40,
              }
            : j
        )
      );

      // 2. Análise Teológica & Resumo com IA
      setBackgroundJobs((prev) =>
        prev.map((j) =>
          j.id === yId
            ? {
                ...j,
                status: 'analyzing',
                stepMessage: 'Gerando resumo profundo em Markdown...',
                progress: 70,
              }
            : j
        )
      );

      const analysis = await generateSermonAnalysis({
        youtubeId: yId,
        youtubeUrl: standardUrl,
        thumbnailUrl: thumb,
        rawTitle: previewTitle,
      });

      const processedData = {
        title: analysis.title || previewTitle,
        youtube_url: standardUrl,
        youtube_id: yId,
        thumbnail_url: thumb,
        preacher: analysis.preacher || previewPreacher || '',
        series_name: analysis.seriesName || '',
        summary: analysis.summary || '',
        practical_application: analysis.practicalApplication || '',
        bible_verses: analysis.bibleVerses || [],
        key_quotes: analysis.keyQuotes || [],
        transcription: analysis.transcription || '',
        published_at: analysis.publishedAt ? analysis.publishedAt.split('T')[0] : (analysis.preachingDate ? analysis.preachingDate : publishedDateStr),
        published: true,
      };

      // Se o modal estiver aberto editando este mesmo vídeo, preenche o form em tempo real
      setFormData((prev) => {
        if (prev.youtube_id === yId || extractYoutubeId(prev.youtube_url) === yId) {
          return {
            ...prev,
            ...processedData,
          };
        }
        return prev;
      });

      // 3. Salvar automaticamente no Supabase se solicitado
      if (autoSave) {
        setBackgroundJobs((prev) =>
          prev.map((j) =>
            j.id === yId
              ? {
                  ...j,
                  status: 'saving',
                  stepMessage: 'Publicando pregação no site...',
                  progress: 90,
                }
              : j
          )
        );

        await api.addSermon({
          title: processedData.title,
          youtube_url: processedData.youtube_url,
          youtube_id: processedData.youtube_id,
          thumbnail_url: processedData.thumbnail_url,
          preacher: processedData.preacher || 'Comunidade Bíblica Vida',
          series_name: processedData.series_name,
          summary: processedData.summary,
          practical_application: processedData.practical_application,
          bible_verses: processedData.bible_verses,
          key_quotes: processedData.key_quotes,
          transcription: processedData.transcription,
          published: true,
          published_at: processedData.published_at ? new Date(processedData.published_at + 'T19:00:00Z').toISOString() : new Date().toISOString(),
        });

        await loadSermons();
      }

      // Conclusão
      setBackgroundJobs((prev) =>
        prev.map((j) =>
          j.id === yId
            ? {
                ...j,
                title: processedData.title,
                status: 'completed',
                stepMessage: autoSave ? 'Pregação publicada com sucesso no site!' : 'Resumo gerado! Clique para revisar.',
                progress: 100,
                sermonData: processedData,
              }
            : j
        )
      );

      toast.success(`🎉 Pregação "${processedData.title}" processada com sucesso!`);

    } catch (err: any) {
      console.error('Erro no job em segundo plano:', err);
      setBackgroundJobs((prev) =>
        prev.map((j) =>
          j.id === yId
            ? {
                ...j,
                status: 'error',
                stepMessage: 'Erro ao processar vídeo.',
                error: err.message || 'Falha na IA',
              }
            : j
        )
      );
      toast.error(`Erro ao processar pregação: ${err.message || 'Erro de conexão'}`);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleOpenCreateDialog = () => {
    setEditingSermonId(null);
    setFormData({
      title: '',
      youtube_url: '',
      youtube_id: '',
      thumbnail_url: '',
      preacher: '',
      series_name: '',
      summary: '',
      practical_application: '',
      bible_verses: [],
      key_quotes: [],
      transcription: '',
      published_at: new Date().toISOString().split('T')[0],
      published: true,
    });
    setCurrentVerseInput('');
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (sermon: Sermon) => {
    setEditingSermonId(sermon.id);
    setFormData({
      title: sermon.title,
      youtube_url: sermon.youtube_url,
      youtube_id: sermon.youtube_id,
      thumbnail_url: sermon.thumbnail_url || getYoutubeThumbnail(sermon.youtube_id),
      preacher: sermon.preacher || '',
      series_name: sermon.series_name || '',
      summary: sermon.summary || '',
      practical_application: sermon.practical_application || '',
      bible_verses: sermon.bible_verses || [],
      key_quotes: sermon.key_quotes || [],
      transcription: sermon.transcription || '',
      published_at: sermon.published_at ? sermon.published_at.split('T')[0] : new Date().toISOString().split('T')[0],
      published: sermon.published,
    });
    setCurrentVerseInput('');
    setIsDialogOpen(true);
  };

  const handleOpenJobInModal = (job: BackgroundJob) => {
    if (job.sermonData) {
      setEditingSermonId(null);
      setFormData(job.sermonData);
      setIsDialogOpen(true);
    }
  };

  // Gerador no modal com opção de background
  const handleAutoProcessWithAi = () => {
    if (!formData.youtube_url) {
      toast.error('Informe a URL do vídeo do YouTube primeiro.');
      return;
    }

    const yId = extractYoutubeId(formData.youtube_url);
    if (!yId) {
      toast.error('Link do YouTube inválido. Exemplo: https://youtu.be/RZqEcqsHElQ');
      return;
    }

    setIsGeneratingAi(true);
    const thumb = getYoutubeThumbnail(yId);

    setFormData((prev) => ({
      ...prev,
      youtube_id: yId,
      thumbnail_url: thumb,
    }));

    startBackgroundJob(formData.youtube_url, false);
  };




  const handleAddVerse = (e?: React.KeyboardEvent | React.MouseEvent) => {
    if (e && 'key' in e && e.key !== 'Enter') return;
    if (e) e.preventDefault();

    const trimmed = currentVerseInput.trim();
    if (trimmed && !formData.bible_verses.includes(trimmed)) {
      setFormData((prev) => ({
        ...prev,
        bible_verses: [...prev.bible_verses, trimmed],
      }));
      setCurrentVerseInput('');
    }
  };

  const handleRemoveVerse = (verseToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      bible_verses: prev.bible_verses.filter((v) => v !== verseToRemove),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const yId = extractYoutubeId(formData.youtube_url);
    if (!yId) {
      toast.error('Informe um link do YouTube válido.');
      return;
    }

    if (!formData.title) {
      toast.error('Preencha o título da mensagem.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        title: formData.title,
        youtube_url: `https://www.youtube.com/watch?v=${yId}`,
        youtube_id: yId,
        thumbnail_url: formData.thumbnail_url || getYoutubeThumbnail(yId),
        preacher: formData.preacher,
        series_name: formData.series_name,
        summary: formData.summary,
        practical_application: formData.practical_application,
        bible_verses: formData.bible_verses,
        key_quotes: formData.key_quotes,
        transcription: formData.transcription,
        published: formData.published,
        published_at: formData.published_at ? new Date(formData.published_at + 'T19:00:00Z').toISOString() : new Date().toISOString(),
      };



      if (editingSermonId) {
        await api.updateSermon(editingSermonId, payload);
        toast.success('Pregação atualizada com sucesso!');
      } else {
        await api.addSermon(payload);
        toast.success('Nova pregação cadastrada e publicada no site!');
      }

      await loadSermons();
      setIsDialogOpen(false);
    } catch (err: any) {
      console.error('Erro ao salvar pregação:', err);
      toast.error(err.message || 'Erro ao salvar pregação.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePublish = async (sermon: Sermon) => {
    try {
      const newStatus = !sermon.published;
      await api.updateSermon(sermon.id, { published: newStatus });
      setSermons((prev) =>
        prev.map((s) => (s.id === sermon.id ? { ...s, published: newStatus } : s))
      );
      toast.success(
        newStatus
          ? 'Mensagem publicada no site!'
          : 'Mensagem despublicada (rascunho privado).'
      );
    } catch (e) {
      toast.error('Erro ao alterar status de publicação.');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza de que deseja excluir esta pregação?')) {
      const ok = await api.deleteSermon(id);
      if (ok) {
        setSermons((prev) => prev.filter((s) => s.id !== id));
        toast.success('Pregação excluída com sucesso.');
      } else {
        toast.error('Erro ao excluir pregação.');
      }
    }
  };

  const handleCopyWebhookUrl = () => {
    const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL || 'https://twnlfxrcalagnnoweohm.supabase.co'}/functions/v1/process-sermon`;
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    toast.success('URL do Webhook copiada para a área de transferência!');
    setTimeout(() => setCopiedWebhook(false), 2500);
  };

  // Filtragem
  const filteredSermons = sermons.filter((s) => {
    const matchesSearch =
      s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.preacher && s.preacher.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.summary && s.summary.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.bible_verses && s.bible_verses.some((v) => v.toLowerCase().includes(searchTerm.toLowerCase())));

    if (!matchesSearch) return false;
    if (statusFilter === 'published') return s.published;
    if (statusFilter === 'draft') return !s.published;
    return true;
  });

  const totalPublished = sermons.filter((s) => s.published).length;
  const totalDrafts = sermons.length - totalPublished;

  return (
    <div className="space-y-8 font-roboto max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* Cabeçalho */}
      <div className="bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/5 border border-border rounded-3xl p-6 md:p-8 glass shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-2 bg-secondary/20 text-secondary font-bold px-3 py-1 rounded-full text-xs mb-2">
            <Video className="w-3.5 h-3.5" />
            <span>Mensagens & Pregações</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
            Gestão de Mensagens e Pregações
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerencie os vídeos do YouTube, resumos teológicos, aplicações práticas e automações com IA para o site.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 justify-center">
          <Button
            variant="secondary"
            onClick={handleOpenCreateDialog}
            className="rounded-2xl shadow-lg hover:scale-105 transition-transform flex items-center space-x-2 h-12 px-6 font-bold"
          >
            <Sparkles className="w-4 h-4 text-secondary-foreground fill-current" />
            <span>Nova Mensagem com IA</span>
          </Button>
        </div>
      </div>

      {/* Barra de Processamento Rápido em 2º Plano */}
      <div className="bg-card/70 border border-secondary/30 rounded-3xl p-5 md:p-6 glass shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 w-full md:w-auto">
          <div className="w-11 h-11 rounded-2xl bg-secondary/15 flex items-center justify-center text-secondary shrink-0 shadow-inner">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <span>Carregar Vídeo em Segundo Plano</span>
              <Badge variant="outline" className="bg-secondary/10 text-secondary text-[10px] border-secondary/30 font-bold">
                Sem Bloqueio
              </Badge>
            </h3>
            <p className="text-xs text-muted-foreground">
              Cole o link do YouTube e continue usando o sistema. A IA transcreve, resume e publica automaticamente.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full md:w-auto flex-1 max-w-xl">
          <div className="relative w-full">
            <Input
              placeholder="Cole o link do YouTube (ex: https://youtu.be/RZqEcqsHElQ)..."
              value={quickUrlInput}
              onChange={(e) => setQuickUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && quickUrlInput.trim()) {
                  startBackgroundJob(quickUrlInput.trim(), true);
                  setQuickUrlInput('');
                }
              }}
              className="rounded-2xl bg-background/70 border-border pl-4 text-sm h-11 focus-visible:ring-secondary/40"
            />
          </div>
          <Button
            variant="secondary"
            disabled={!quickUrlInput.trim()}
            onClick={() => {
              startBackgroundJob(quickUrlInput.trim(), true);
              setQuickUrlInput('');
            }}
            className="rounded-2xl font-bold h-11 px-5 shrink-0 shadow-md flex items-center gap-2 w-full sm:w-auto justify-center"
          >
            <Sparkles className="w-4 h-4" />
            <span>Processar & Publicar</span>
          </Button>
        </div>
      </div>

      {/* Métricas Rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="rounded-3xl border-border bg-card/60 glass hover-lift">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Total de Pregações</p>
              <h3 className="text-3xl font-bold text-foreground mt-1">{sermons.length}</h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <Video className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-border bg-card/60 glass hover-lift">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Publicadas no Site</p>
              <h3 className="text-3xl font-bold text-emerald-500 mt-1">{totalPublished}</h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <Globe className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-border bg-card/60 glass hover-lift">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Rascunhos / Ocultos</p>
              <h3 className="text-3xl font-bold text-amber-500 mt-1">{totalDrafts}</h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
              <FileText className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Abas Principais: Pregações vs Automação */}
      <Tabs defaultValue="list" className="w-full space-y-6">
        <TabsList className="bg-muted/80 p-1 rounded-2xl border border-border">
          <TabsTrigger value="list" className="rounded-xl font-bold flex items-center gap-2">
            <Layers className="w-4 h-4" />
            <span>Lista de Mensagens ({filteredSermons.length})</span>
          </TabsTrigger>
          <TabsTrigger value="automation" className="rounded-xl font-bold flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <span>Hub de Automação & Webhooks</span>
          </TabsTrigger>
        </TabsList>

        {/* ABA 1: Lista de Pregações */}
        <TabsContent value="list" className="space-y-6">
          {/* Barra de Filtros */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card/40 p-4 rounded-2xl border border-border">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título, pregador ou versículo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rounded-xl bg-background/50 border-border"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('all')}
                className="rounded-xl text-xs"
              >
                Todas ({sermons.length})
              </Button>
              <Button
                variant={statusFilter === 'published' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('published')}
                className="rounded-xl text-xs"
              >
                Publicadas ({totalPublished})
              </Button>
              <Button
                variant={statusFilter === 'draft' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('draft')}
                className="rounded-xl text-xs"
              >
                Rascunhos ({totalDrafts})
              </Button>
            </div>
          </div>

          {/* Grid de Cards de Pregações */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-80 bg-card/50 rounded-3xl border border-border" />
              ))}
            </div>
          ) : filteredSermons.length === 0 ? (
            <div className="text-center py-16 bg-card/30 rounded-3xl border border-border/60 space-y-4">
              <Video className="w-12 h-12 text-muted-foreground/40 mx-auto" />
              <h3 className="text-lg font-bold text-foreground">Nenhuma pregação encontrada</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {searchTerm
                  ? 'Nenhum resultado corresponde à sua pesquisa.'
                  : 'Cadastre sua primeira mensagem usando o assistente de IA ou conecte o webhook de automação do YouTube.'}
              </p>
              <Button onClick={handleOpenCreateDialog} variant="secondary" className="rounded-xl">
                <Plus className="w-4 h-4 mr-2" />
                Cadastrar Mensagem
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSermons.map((sermon) => {
                const thumb = sermon.thumbnail_url || getYoutubeThumbnail(sermon.youtube_id);
                return (
                  <Card
                    key={sermon.id}
                    className="rounded-3xl border-border/80 bg-card/80 glass overflow-hidden hover-lift flex flex-col group transition-all"
                  >
                    {/* Thumbnail com Overlay */}
                    <div className="relative aspect-video w-full bg-black overflow-hidden cursor-pointer" onClick={() => setSelectedSermonForView(sermon)}>
                      <img
                        src={thumb}
                        alt={sermon.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <Play className="w-5 h-5 fill-current ml-0.5" />
                        </div>
                      </div>

                      {/* Badges de Status sobre a imagem */}
                      <div className="absolute top-3 left-3 flex gap-2 flex-wrap pr-3">
                        {sermon.published ? (
                          <Badge className="bg-emerald-500/90 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow">
                            No Ar
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-black/60 text-amber-300 border-amber-400/40 text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow">
                            Rascunho
                          </Badge>
                        )}
                        {sermon.series_name && (
                          <Badge className="bg-primary/80 text-primary-foreground text-[10px] font-medium px-2.5 py-0.5 rounded-full shadow">
                            {sermon.series_name}
                          </Badge>
                        )}
                        {sermon.published_at && (
                          <Badge className="bg-black/60 text-white border-none text-[10px] font-medium px-2.5 py-0.5 rounded-full shadow backdrop-blur-md">
                            {new Date(sermon.published_at).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Conteúdo do Card */}
                    <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <p className="text-xs text-secondary font-semibold">
                          {sermon.preacher || 'Comunidade Bíblica Vida'}
                        </p>
                        <h3 className="font-bold text-base text-foreground line-clamp-2 leading-snug group-hover:text-secondary transition-colors">
                          {sermon.title}
                        </h3>
                        {sermon.summary && (
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {sermon.summary}
                          </p>
                        )}
                      </div>

                      {/* Textos Bíblicos Tags */}
                      {sermon.bible_verses && sermon.bible_verses.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {sermon.bible_verses.slice(0, 2).map((v, i) => (
                            <Badge
                              key={i}
                              variant="outline"
                              className="text-[11px] bg-muted/60 text-foreground font-medium px-2 py-0.5 rounded-md"
                            >
                              📖 {v}
                            </Badge>
                          ))}
                          {sermon.bible_verses.length > 2 && (
                            <span className="text-[10px] text-muted-foreground font-semibold self-center">
                              +{sermon.bible_verses.length - 2}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Ações e Controles */}
                      <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={sermon.published}
                            onCheckedChange={() => handleTogglePublish(sermon)}
                            className="data-[state=checked]:bg-emerald-500"
                          />
                          <span className="text-[11px] font-medium text-muted-foreground">
                            {sermon.published ? 'Publicado' : 'Oculto'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2.5 rounded-lg bg-[#25D366]/15 text-[#25D366] hover:bg-[#25D366]/25 font-bold text-xs flex items-center gap-1.5 shadow-sm"
                            onClick={() => {
                              const text = formatSermonForWhatsApp(sermon);
                              navigator.clipboard.writeText(text);
                              toast.success('Resumo copiado para o WhatsApp!');
                            }}
                            title="Copiar Pontos Centrais para o WhatsApp"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg hover:bg-secondary/10 hover:text-secondary"
                            onClick={() => setSelectedSermonForView(sermon)}
                            title="Visualizar Resumo Completo"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg hover:bg-primary/10 text-foreground"
                            onClick={() => handleOpenEditDialog(sermon)}
                            title="Editar Pregação"
                          >
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg hover:bg-destructive/10 text-destructive"
                            onClick={() => handleDelete(sermon.id)}
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ABA 2: Hub de Automação & Webhooks */}
        <TabsContent value="automation" className="space-y-6">
          <Card className="rounded-3xl border-border bg-card/80 glass">
            <CardHeader className="p-6 md:p-8 border-b border-border">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 flex items-center justify-center text-amber-500 font-bold">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-foreground">
                    Automação Headless de Pregações (Apify ➔ IA ➔ Supabase ➔ Site)
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Conecte o canal do YouTube da CBVida para que todo novo culto seja transcrito e publicado automaticamente.
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 md:p-8 space-y-6">
              {/* Endpoint Webhook */}
              <div className="space-y-2">
                <Label className="text-foreground font-semibold text-sm">
                  Webhook URL (Supabase Edge Function)
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={`${import.meta.env.VITE_SUPABASE_URL || 'https://twnlfxrcalagnnoweohm.supabase.co'}/functions/v1/process-sermon`}
                    className="font-mono text-xs bg-muted/60 rounded-xl"
                  />
                  <Button
                    variant="secondary"
                    onClick={handleCopyWebhookUrl}
                    className="rounded-xl flex items-center gap-2 flex-shrink-0"
                  >
                    {copiedWebhook ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedWebhook ? 'Copiado!' : 'Copiar URL'}</span>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Envie requisições HTTP <code>POST</code> com o JSON <code>{`{ "youtube_url": "...", "transcription": "..." }`}</code>.
                </p>
              </div>

              {/* Passo a Passo Visual */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                <div className="p-5 rounded-2xl bg-muted/40 border border-border space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-primary/20 text-primary font-bold flex items-center justify-center text-sm">
                    1
                  </div>
                  <h4 className="font-bold text-foreground text-sm">Monitoramento Apify</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    O Apify monitora o canal <code>@comunidadebiblicavida</code> e extrai a transcrição do áudio assim que o culto termina.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-muted/40 border border-border space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-secondary/20 text-secondary font-bold flex items-center justify-center text-sm">
                    2
                  </div>
                  <h4 className="font-bold text-foreground text-sm">Análise com IA</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    A IA gera automaticamente o resumo teológico, 3 passos práticos para a semana e extrai os textos bíblicos.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-muted/40 border border-border space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-500 font-bold flex items-center justify-center text-sm">
                    3
                  </div>
                  <h4 className="font-bold text-foreground text-sm">Publicação Instantânea</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Os dados são salvos no Supabase com <code>published: true</code> e aparecem na hora na página inicial do site.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-border flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Consulte o arquivo <code>AUTOMACAO_MENSAGENS_YOUTUBE.md</code> na raiz do projeto para o guia completo com Make/Zapier.
                </span>
                <Button
                  variant="outline"
                  onClick={handleOpenCreateDialog}
                  className="rounded-xl border-border hover:bg-secondary/10 hover:text-secondary text-xs"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  Testar Gerador de IA Agora
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL DE CADASTRO / EDIÇÃO COM ASSISTENTE DE IA */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl glass border border-border p-6 md:p-8 bg-card/95">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-secondary" />
              <span>{editingSermonId ? 'Editar Pregação' : 'Nova Pregação com Assistente de IA'}</span>
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Cole o link do YouTube e clique em "Processar com IA" para preencher o resumo, aplicação e passagens bíblicas automaticamente.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            {/* Campo URL do YouTube com Botão Mágico */}
            <div className="space-y-2 p-4 rounded-2xl bg-secondary/5 border border-secondary/20">
              <Label htmlFor="youtube_url" className="text-foreground font-bold flex items-center justify-between">
                <span>URL do Vídeo no YouTube *</span>
                <span className="text-xs text-secondary font-normal">Aceita links comuns, shorts ou lives</span>
              </Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  id="youtube_url"
                  required
                  placeholder="Ex: https://www.youtube.com/watch?v=RZqEcqsHElQ"
                  value={formData.youtube_url}
                  onChange={(e) => setFormData((prev) => ({ ...prev, youtube_url: e.target.value }))}
                  className="rounded-xl bg-background border-border"
                />
                <Button
                  type="button"
                  onClick={handleAutoProcessWithAi}
                  disabled={isGeneratingAi || !formData.youtube_url}
                  className="rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/90 flex-shrink-0 font-bold shadow-md"
                >
                  {isGeneratingAi ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Processar com IA
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Banner de Processamento Ativo no Modal */}
            {isGeneratingAi && (
              <div className="p-4 rounded-2xl bg-secondary/10 border border-secondary/30 space-y-2.5 animate-fade-in">
                <div className="flex items-center justify-between text-xs font-bold text-secondary">
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processando pregação com IA...
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsDialogOpen(false)}
                    className="h-7 text-xs font-bold text-secondary hover:bg-secondary/20 rounded-lg flex items-center gap-1.5"
                  >
                    <Minimize2 className="w-3.5 h-3.5" />
                    Minimizar e continuar navegando
                  </Button>
                </div>
                <div className="w-full bg-secondary/20 h-2 rounded-full overflow-hidden">
                  <div className="bg-secondary h-full rounded-full transition-all duration-500 animate-pulse w-3/4" />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Você pode fechar esta janela; a IA continuará gerando em segundo plano e você poderá reabrir os dados prontos a qualquer momento!
                </p>
              </div>
            )}

            {/* Informações Básicas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="title" className="text-foreground font-semibold">
                  Título da Mensagem *
                </Label>
                <Input
                  id="title"
                  required
                  placeholder="Ex: O Convite da Graça: Descanso para a Alma"
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="preacher" className="text-foreground font-semibold">
                  Pregador / Pastor
                </Label>
                <Input
                  id="preacher"
                  placeholder="Ex: Pr. Roberto Macedo"
                  value={formData.preacher}
                  onChange={(e) => setFormData((prev) => ({ ...prev, preacher: e.target.value }))}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="published_at" className="text-foreground font-semibold">
                  Data do Culto / Pregação
                </Label>
                <Input
                  id="published_at"
                  type="date"
                  value={formData.published_at}
                  onChange={(e) => setFormData((prev) => ({ ...prev, published_at: e.target.value }))}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="series_name" className="text-foreground font-semibold">
                  Série Temática (Opcional)
                </Label>
                <Input
                  id="series_name"
                  placeholder="Ex: Jesus É..., Graça Transformadora"
                  value={formData.series_name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, series_name: e.target.value }))}
                  className="rounded-xl"
                />
              </div>
            </div>


            {/* Textos Bíblicos (Chips/Tags) */}
            <div className="space-y-2">
              <Label className="text-foreground font-semibold flex items-center justify-between">
                <span>Textos Bíblicos Principais</span>
                <span className="text-xs text-muted-foreground">Pressione Enter ou clique em +</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: Mateus 11:28-30 ou João 14:27"
                  value={currentVerseInput}
                  onChange={(e) => setCurrentVerseInput(e.target.value)}
                  onKeyDown={handleAddVerse}
                  className="rounded-xl"
                />
                <Button type="button" variant="outline" onClick={() => handleAddVerse()} className="rounded-xl">
                  <Plus className="w-4 h-4 mr-1" /> Adicionar
                </Button>
              </div>

              {formData.bible_verses.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {formData.bible_verses.map((verse, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="rounded-lg px-3 py-1 text-xs font-semibold flex items-center gap-1.5 bg-muted border border-border text-foreground"
                    >
                      📖 {verse}
                      <button
                        type="button"
                        onClick={() => handleRemoveVerse(verse)}
                        className="hover:text-destructive ml-1 text-sm font-bold"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Resumo da Mensagem */}
            <div className="space-y-2">
              <Label htmlFor="summary" className="text-foreground font-semibold flex items-center justify-between">
                <span>Resumo Teológico / Devocional (Suporta Markdown)</span>
                <span className="text-xs text-muted-foreground">Formatado com títulos, tópicos e ênfases</span>
              </Label>
              <Textarea
                id="summary"
                rows={6}
                placeholder="Explicação detalhada dos pontos principais, ilustrações e mensagem pastoral..."
                value={formData.summary}
                onChange={(e) => setFormData((prev) => ({ ...prev, summary: e.target.value }))}
                className="rounded-xl leading-relaxed font-sans text-sm"
              />
            </div>

            {/* Aplicação Prática */}
            <div className="space-y-2">
              <Label htmlFor="practical_application" className="text-foreground font-semibold flex items-center justify-between">
                <span>Aplicação Prática (Lições para a Semana)</span>
                <span className="text-xs text-muted-foreground">Passos acionáveis para o dia a dia</span>
              </Label>
              <Textarea
                id="practical_application"
                rows={4}
                placeholder="1. Reserve momentos diários de oração...&#10;2. Pratique o perdão...&#10;3. Compartilhe uma palavra de esperança..."
                value={formData.practical_application}
                onChange={(e) => setFormData((prev) => ({ ...prev, practical_application: e.target.value }))}
                className="rounded-xl leading-relaxed text-sm"
              />
            </div>

            {/* Transcrição Opcional */}
            <div className="space-y-2">
              <Label htmlFor="transcription" className="text-foreground font-semibold">
                Transcrição Completa (Opcional)
              </Label>
              <Textarea
                id="transcription"
                rows={3}
                placeholder="Texto completo ou introdução do áudio transcrito..."
                value={formData.transcription}
                onChange={(e) => setFormData((prev) => ({ ...prev, transcription: e.target.value }))}
                className="rounded-xl text-xs font-mono"
              />
            </div>

            {/* Switch de Publicação */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/50 border border-border">
              <div className="space-y-0.5">
                <Label htmlFor="published" className="text-foreground font-bold cursor-pointer">
                  Publicar Imediatamente no Site
                </Label>
                <p className="text-xs text-muted-foreground">
                  Se ativado, esta pregação aparecerá no carrossel de mensagens da página inicial.
                </p>
              </div>
              <Switch
                id="published"
                checked={formData.published}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, published: checked }))}
                className="data-[state=checked]:bg-emerald-500"
              />
            </div>

            {/* Footer com Ações */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => openWhatsAppShare(formData)}
                  className="rounded-xl border-[#25D366]/40 text-[#25D366] hover:bg-[#25D366]/10 font-bold text-xs flex items-center gap-1.5"
                  title="Abrir no WhatsApp Web/App com formatação dos Pontos Centrais"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Enviar WhatsApp</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    const text = formatSermonForWhatsApp(formData);
                    navigator.clipboard.writeText(text);
                    toast.success('Texto dos Pontos Centrais copiado para o WhatsApp!');
                  }}
                  className="rounded-xl text-muted-foreground hover:text-foreground font-medium text-xs flex items-center gap-1.5"
                  title="Copiar texto dos Pontos Centrais para a área de transferência"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Texto</span>
                </Button>
              </div>

              <div className="flex items-center justify-end gap-3 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="rounded-xl font-medium"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-xl bg-primary text-primary-foreground font-bold px-8 shadow-md"
                >
                  {isSaving ? 'Salvando...' : editingSermonId ? 'Salvar Alterações' : 'Publicar Pregação'}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* WIDGET FLUTUANTE DE PROCESSAMENTO EM SEGUNDO PLANO */}
      {backgroundJobs.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full space-y-3 pointer-events-auto">
          {backgroundJobs.map((job) => (
            <div
              key={job.id}
              className="glass border border-secondary/30 shadow-2xl rounded-3xl p-4 bg-card/95 backdrop-blur-xl text-foreground flex flex-col gap-3 animate-fade-in"
            >
              <div className="flex items-start gap-3 justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-black shrink-0 border border-border/80">
                    <img src={job.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                    {job.status !== 'completed' && job.status !== 'error' && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 text-secondary animate-spin" />
                      </div>
                    )}
                    {job.status === 'completed' && (
                      <div className="absolute inset-0 bg-emerald-600/80 flex items-center justify-center text-white">
                        <Check className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">
                        {job.status === 'completed' ? 'Finalizado' : 'Segundo Plano'}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">({job.progress}%)</span>
                    </div>
                    <h4 className="font-bold text-xs text-foreground truncate">{job.title}</h4>
                    <p className="text-[11px] text-muted-foreground truncate">{job.stepMessage}</p>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setBackgroundJobs((prev) => prev.filter((j) => j.id !== job.id))}
                  className="h-6 w-6 rounded-lg text-muted-foreground hover:text-foreground shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>

              {/* Barra de Progresso */}
              <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    job.status === 'completed'
                      ? 'bg-emerald-500'
                      : job.status === 'error'
                      ? 'bg-destructive'
                      : 'bg-secondary'
                  }`}
                  style={{ width: `${job.progress}%` }}
                />
              </div>

              {/* Ações do Card */}
              {job.status === 'completed' && (
                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleOpenJobInModal(job)}
                    className="rounded-xl text-xs h-8 font-bold flex items-center gap-1.5 shadow-sm"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Ver no Formulário</span>
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* MODAL DE VISUALIZAÇÃO DE DETALHES */}
      <SermonDetailsModal
        sermon={selectedSermonForView}
        isOpen={!!selectedSermonForView}
        onClose={() => setSelectedSermonForView(null)}
      />
    </div>
  );
}
