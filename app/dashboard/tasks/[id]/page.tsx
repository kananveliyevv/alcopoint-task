'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import { Task, Comment, TaskFile } from '@/lib/types'
import { STATUS_LABELS, STATUS_COLORS, PRIORITET_LABELS, PRIORITET_COLORS } from '@/lib/constants'
import { formatDate, formatDateTime, formatFileSize, isOverdue, cn, getInitials, timeAgo } from '@/lib/utils'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ArrowLeft, Edit, Trash2, Calendar, User, Flag, Clock,
  MessageSquare, Send, Paperclip, Download, FileText,
  AlertTriangle, CheckCircle2, Loader2
} from 'lucide-react'

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user, isAdmin } = useAuth()
  const router = useRouter()
  const [task, setTask] = useState<Task | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [files, setFiles] = useState<TaskFile[]>([])
  const [loading, setLoading] = useState(true)
  const [commentText, setCommentText] = useState('')
  const [sendingComment, setSendingComment] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const supabase = createClient()

  const fetchTask = useCallback(async () => {
    const { data } = await supabase
      .from('tasks')
      .select(`
        *,
        icraci_profile:profiles!tasks_icraci_fkey(*),
        yaradan_profile:profiles!tasks_yaradan_fkey(*)
      `)
      .eq('id', id)
      .single()
    if (data) setTask(data as Task)
    setLoading(false)
  }, [id, supabase])

  const fetchComments = useCallback(async () => {
    const { data } = await supabase
      .from('comments')
      .select('*, user_profile:profiles(*)')
      .eq('task_id', id)
      .order('yaradilib', { ascending: true })
    if (data) setComments(data as Comment[])
  }, [id, supabase])

  const fetchFiles = useCallback(async () => {
    const { data } = await supabase
      .from('task_files')
      .select('*, yukleyen_profile:profiles(*)')
      .eq('task_id', id)
      .order('yaradilib', { ascending: false })
    if (data) setFiles(data as TaskFile[])
  }, [id, supabase])

  useEffect(() => {
    fetchTask()
    fetchComments()
    fetchFiles()

    // Realtime comments
    const channel = supabase
      .channel(`task-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments', filter: `task_id=eq.${id}` },
        () => fetchComments()
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchTask, fetchComments, fetchFiles, supabase, id])

  const handleStatusChange = async (newStatus: string) => {
    if (!task) return
    setUpdatingStatus(true)
    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', id)

    if (error) { toast.error('Status dəyişdirilmədi'); setUpdatingStatus(false); return }

    // Bildiriş
    if (task.yaradan && task.yaradan !== user?.id) {
      await supabase.from('notifications').insert({
        user_id: task.yaradan,
        task_id: id,
        tip: 'status_deyisdi',
        mesaj: `"${task.basliq}" tapşırığının statusu dəyişdi: ${STATUS_LABELS[newStatus as keyof typeof STATUS_LABELS]}`,
      })
    }

    setTask(prev => prev ? { ...prev, status: newStatus as Task['status'] } : null)
    toast.success('Status yeniləndi')
    setUpdatingStatus(false)
  }

  const handleAddComment = async () => {
    if (!commentText.trim() || !user) return
    setSendingComment(true)
    const { error } = await supabase.from('comments').insert({
      task_id: id,
      user_id: user.id,
      content: commentText.trim(),
    })
    if (error) { toast.error('Şərh əlavə edilmədi'); setSendingComment(false); return }

    // Bildiriş (tapşırıq yaradana)
    if (task?.yaradan && task.yaradan !== user.id) {
      await supabase.from('notifications').insert({
        user_id: task.yaradan,
        task_id: id,
        tip: 'yeni_serh',
        mesaj: `"${task.basliq}" tapşırığına yeni şərh əlavə edildi`,
      })
    }

    setCommentText('')
    fetchComments()
    setSendingComment(false)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    if (file.size > 50 * 1024 * 1024) {
      toast.error('Fayl 50MB-dan böyük ola bilməz')
      return
    }
    setUploadingFile(true)
    const fileName = `${id}/${Date.now()}-${file.name}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('task-files')
      .upload(fileName, file)

    if (uploadError) { toast.error('Fayl yüklənmədi'); setUploadingFile(false); return }

    const { data: { publicUrl } } = supabase.storage.from('task-files').getPublicUrl(uploadData.path)

    await supabase.from('task_files').insert({
      task_id: id,
      fayl_adi: file.name,
      fayl_url: publicUrl,
      fayl_olcusu: file.size,
      yukleyen: user.id,
    })
    toast.success('Fayl yükləndi')
    fetchFiles()
    setUploadingFile(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!task) {
    return (
      <div className="text-center py-20">
        <p className="text-foreground font-medium">Tapşırıq tapılmadı</p>
        <Link href="/dashboard/tasks" className="text-primary text-sm mt-2 block">
          Geri qayıt
        </Link>
      </div>
    )
  }

  const gecikib = task.son_tarix ? isOverdue(task.son_tarix) && task.status !== 'tamamlanib' : false
  const canChangeStatus = isAdmin || task.icraci === user?.id

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/tasks"
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">{task.basliq}</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {task.yaradan_profile?.ad_soyad} tərəfindən yaradıldı • {timeAgo(task.yaradilib)}
            </p>
          </div>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              href={`/dashboard/tasks/${id}/edit`}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-foreground border border-border rounded-lg hover:bg-accent transition-colors"
            >
              <Edit className="w-4 h-4" />
              <span className="hidden sm:inline">Redaktə</span>
            </Link>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-5">
          {/* Task description */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-foreground mb-3">Təsvir</h3>
            {task.tesvir ? (
              <p className="text-foreground/80 text-sm leading-relaxed whitespace-pre-wrap">{task.tesvir}</p>
            ) : (
              <p className="text-muted-foreground text-sm italic">Təsvir əlavə edilməyib</p>
            )}
          </div>

          {/* Files */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Paperclip className="w-4 h-4" />
                Fayllar ({files.length})
              </h3>
              <label className={cn(
                'flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg cursor-pointer transition-colors',
                uploadingFile
                  ? 'bg-muted text-muted-foreground'
                  : 'bg-primary/10 text-primary hover:bg-primary/20'
              )}>
                {uploadingFile ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Paperclip className="w-3.5 h-3.5" />
                )}
                {uploadingFile ? 'Yüklənir...' : 'Fayl əlavə et'}
                <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploadingFile} />
              </label>
            </div>
            {files.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">Fayl yüklənməyib</p>
            ) : (
              <div className="space-y-2">
                {files.map(file => (
                  <div key={file.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <FileText className="w-8 h-8 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{file.fayl_adi}</p>
                      <p className="text-xs text-muted-foreground">
                        {file.fayl_olcusu ? formatFileSize(file.fayl_olcusu) : ''} • {file.yukleyen_profile?.ad_soyad}
                      </p>
                    </div>
                    <a
                      href={file.fayl_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Comments */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
              <MessageSquare className="w-4 h-4" />
              Şərhlər ({comments.length})
            </h3>

            <div className="space-y-4 mb-5">
              {comments.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">Hələ şərh yoxdur</p>
              ) : (
                comments.map(comment => (
                  <div key={comment.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                      {getInitials(comment.user_profile?.ad_soyad || '?')}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-foreground">
                          {comment.user_profile?.ad_soyad}
                        </span>
                        <span className="text-xs text-muted-foreground">{timeAgo(comment.yaradilib)}</span>
                      </div>
                      <p className="text-sm text-foreground/80 bg-muted/50 rounded-lg px-3 py-2">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Comment input */}
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground flex-shrink-0">
                {getInitials(user?.email?.split('@')[0] || '?')}
              </div>
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAddComment()}
                  placeholder="Şərh əlavə edin..."
                  className="flex-1 px-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  disabled={sendingComment}
                />
                <button
                  onClick={handleAddComment}
                  disabled={!commentText.trim() || sendingComment}
                  className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {sendingComment ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar info */}
        <div className="space-y-4">
          {/* Status */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-foreground mb-3">Status</h3>
            {canChangeStatus ? (
              <div className="space-y-2">
                {(['gozleyir', 'icra_olunur', 'tamamlanib'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    disabled={updatingStatus}
                    className={cn(
                      'w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
                      task.status === s
                        ? STATUS_COLORS[s] + ' ring-2 ring-current ring-offset-1'
                        : 'text-muted-foreground hover:bg-accent border border-border'
                    )}
                  >
                    <span>{STATUS_LABELS[s]}</span>
                    {task.status === s && <CheckCircle2 className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            ) : (
              <span className={cn('inline-block text-sm px-3 py-1.5 rounded-lg font-medium', STATUS_COLORS[task.status])}>
                {STATUS_LABELS[task.status]}
              </span>
            )}
          </div>

          {/* Details */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="font-semibold text-foreground">Detallar</h3>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Flag className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Prioritet</p>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', PRIORITET_COLORS[task.prioritet])}>
                    {PRIORITET_LABELS[task.prioritet]}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">İcraçı</p>
                  <p className="text-sm text-foreground font-medium">
                    {task.icraci_profile?.ad_soyad || 'Təyin edilməyib'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Son tarix</p>
                  {task.son_tarix ? (
                    <p className={cn('text-sm font-medium flex items-center gap-1', gecikib ? 'text-rose-500' : 'text-foreground')}>
                      {gecikib && <AlertTriangle className="w-3.5 h-3.5" />}
                      {formatDate(task.son_tarix)}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Müəyyən edilməyib</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Yaradılıb</p>
                  <p className="text-sm text-foreground">{formatDateTime(task.yaradilib)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
