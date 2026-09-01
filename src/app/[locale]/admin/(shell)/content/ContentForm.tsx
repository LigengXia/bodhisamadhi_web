'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Button } from '@/components/Button/Button';
import { Field } from '@/components/Field/Field';
import { Select } from '@/components/Field/Select';
import { InlineAlert } from '@/components/InlineAlert/InlineAlert';
import { Modal } from '@/components/Modal/Modal';
import { TrilingualField } from '@/components/TrilingualField/TrilingualField';
import { contentTypes } from '@/lib/schemas/content';

import { saveContentAction, type ContentFormState } from './actions';
import { YouTubeField } from './YouTubeField';
import { ScriptUploadField } from './ScriptUploadField';
import { AudioUploadField } from './AudioUploadField';
import styles from './content.module.css';

type Option = { id: string; label: string };
type Defaults = {
  id: string;
  type: (typeof contentTypes)[number];
  title: Record<string, string>;
  description: Record<string, string>;
  teacher_id: string | null;
  series_id: string | null;
  part_number: number | null;
  recorded_at: string | null;
  status: 'draft' | 'published' | 'archived';
  youtube_id: string | null;
  pdf_url: string | null;
  pdf_pages: number | null;
  allow_download: boolean;
  audio_url: string | null;
  duration_seconds: number | null;
};

const initial: ContentFormState = {};

export function ContentForm({
  mode,
  teachers,
  series,
  defaults,
  previewHref,
}: {
  mode: 'new' | 'edit';
  teachers: Option[];
  series: Option[];
  defaults?: Defaults;
  previewHref?: string;
}) {
  const t = useTranslations('admin.contentForm');
  const tc = useTranslations('admin.content');
  const router = useRouter();
  const [type, setType] = useState<(typeof contentTypes)[number] | null>(
    defaults?.type ?? null,
  );
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [state, formAction, pending] = useActionState(
    saveContentAction,
    initial,
  );

  useEffect(() => {
    if (state.redirectTo) {
      toast.success(
        tc(
          state.savedAs === 'published' ? 'toastPublished' : 'toastDraftSaved',
        ),
      );
      router.replace(state.redirectTo);
    }
  }, [state.redirectTo, state.savedAs, router, tc]);

  const err = state.fieldErrors ?? {};

  // React 19 resets the form after every `<form action>` submit, so uncontrolled
  // fields must fall back to what was just typed (echoed in `state.values`),
  // then to the row being edited, then empty.
  const v = state.values;
  const titleDefaults = v
    ? { en: v.title_en, zh: v.title_zh, bo: v.title_bo }
    : defaults?.title;
  const descDefaults = v
    ? { en: v.desc_en, zh: v.desc_zh, bo: v.desc_bo }
    : defaults?.description;
  const dv = (key: string, fallback: string | number | null | undefined) =>
    v?.[key] ?? fallback ?? '';

  // Step 1 (new only): choose the type.
  if (mode === 'new' && !type) {
    return (
      <div className={styles.typePicker}>
        <h2 className={styles.pickerHeading}>{t('chooseType')}</h2>
        {contentTypes.map((ct) => {
          const name =
            ct === 'video'
              ? tc('typeVideo')
              : ct === 'audio'
                ? tc('typeAudio')
                : tc('typeScript');
          const desc =
            ct === 'video'
              ? t('typeVideoDesc')
              : ct === 'audio'
                ? t('typeAudioDesc')
                : t('typeScriptDesc');
          return (
            <button
              key={ct}
              type="button"
              className={styles.typeChoice}
              onClick={() => setType(ct)}
            >
              <strong>{name}</strong>
              <span>{desc}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <form action={formAction} className={styles.form} noValidate>
      {defaults?.id && <input type="hidden" name="id" value={defaults.id} />}
      <input type="hidden" name="type" value={type ?? 'video'} />

      {(state.formError || Object.keys(err).length > 0) && (
        <InlineAlert variant="error">
          {state.formError ? t('errSaveBody') : t('errSummary')}
        </InlineAlert>
      )}

      <TrilingualField
        name="title"
        label={t('titleLabel')}
        help={t('titleHelp')}
        error={err['title.en'] ? t('errEnglishTitle') : undefined}
        defaultValues={titleDefaults}
      />

      <TrilingualField
        name="desc"
        label={t('descriptionLabel')}
        multiline
        defaultValues={descDefaults}
      />

      {type === 'video' && (
        <YouTubeField
          defaultValue={String(dv('youtube', defaults?.youtube_id))}
          error={err['youtube'] ? t('errYoutube') : undefined}
        />
      )}

      {type === 'script' && (
        <ScriptUploadField
          defaultKey={v?.pdf_key ?? defaults?.pdf_url ?? ''}
          defaultPages={
            v?.pdf_pages ? Number(v.pdf_pages) : (defaults?.pdf_pages ?? null)
          }
          defaultAllowDownload={
            v?.allow_download !== undefined
              ? v.allow_download === 'true' || v.allow_download === 'on'
              : (defaults?.allow_download ?? true)
          }
          error={err['pdf_key'] ? t('errPdfRequired') : undefined}
        />
      )}

      {type === 'audio' && (
        <AudioUploadField
          defaultKey={v?.audio_key ?? defaults?.audio_url ?? ''}
          defaultSeconds={
            v?.duration_seconds
              ? Number(v.duration_seconds)
              : (defaults?.duration_seconds ?? null)
          }
          error={err['audio_key'] ? t('errAudioRequired') : undefined}
        />
      )}

      <Select
        label={t('teacherLabel')}
        name="teacher_id"
        defaultValue={String(dv('teacher_id', defaults?.teacher_id))}
      >
        <option value="">{t('teacherNone')}</option>
        {teachers.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </Select>

      <Select
        label={t('seriesLabel')}
        name="series_id"
        defaultValue={String(dv('series_id', defaults?.series_id))}
      >
        <option value="">{t('seriesNone')}</option>
        {series.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </Select>

      <Field
        label={t('partLabel')}
        name="part_number"
        type="number"
        min={1}
        inputMode="numeric"
        help={t('partHelp')}
        error={err['part_number'] ? t('errPartNeedsSeries') : undefined}
        defaultValue={String(dv('part_number', defaults?.part_number))}
      />

      <Field
        label={t('recordedLabel')}
        name="recorded_at"
        type="date"
        defaultValue={String(dv('recorded_at', defaults?.recorded_at))}
      />

      <Select
        label={t('visibilityLabel')}
        name="visibility_display"
        defaultValue="public"
        help={t('visibilityMembersDisabled')}
        disabled
      >
        <option value="public">{t('visibilityPublic')}</option>
      </Select>
      <input type="hidden" name="visibility" value="public" />

      <div className={styles.actions}>
        <Button
          type="submit"
          name="status"
          value="draft"
          variant="secondary"
          loading={pending}
        >
          {pending ? t('saveDraftBusy') : t('saveDraft')}
        </Button>
        <Button type="submit" name="status" value="published" loading={pending}>
          {pending ? t('savePublishBusy') : t('savePublish')}
        </Button>
        {mode === 'edit' && previewHref && (
          <Button href={previewHref} variant="ghost">
            {t('preview')}
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          onClick={() => setConfirmCancel(true)}
        >
          {t('cancel')}
        </Button>
      </div>

      <Modal
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        title={t('cancelDirtyTitle')}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setConfirmCancel(false)}
              type="button"
            >
              {t('cancelDirtyStay')}
            </Button>
            <Button
              variant="danger"
              type="button"
              onClick={() => router.back()}
            >
              {t('cancelDirtyConfirm')}
            </Button>
          </>
        }
      >
        {t('cancelDirtyBody')}
      </Modal>
    </form>
  );
}
