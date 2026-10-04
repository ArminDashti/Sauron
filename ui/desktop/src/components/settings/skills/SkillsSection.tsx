import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Loader2, Pencil, Save } from 'lucide-react';
import type { SourceEntry, SourceType } from '@aaif/sauron-acp-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { listSkillSources } from '../../../acp/sources';
import { getAcpClient } from '../../../acp/acpConnection';
import { getInitialWorkingDir } from '../../../utils/workingDir';
import { defineMessages, useIntl } from '../../../i18n';

const i18n = defineMessages({
  title: {
    id: 'skillsSection.title',
    defaultMessage: 'Skills',
  },
  description: {
    id: 'skillsSection.description',
    defaultMessage:
      'Skills extend what the agent can do. Sauron discovers them from SKILL.md files in your global and project skill directories.',
  },
  loading: {
    id: 'skillsSection.loading',
    defaultMessage: 'Loading skills...',
  },
  loadFailed: {
    id: 'skillsSection.loadFailed',
    defaultMessage: 'Failed to load skills',
  },
  empty: {
    id: 'skillsSection.empty',
    defaultMessage: 'No skills are installed.',
  },
  globalScope: {
    id: 'skillsSection.globalScope',
    defaultMessage: 'Global',
  },
  projectScope: {
    id: 'skillsSection.projectScope',
    defaultMessage: 'Project',
  },
  openSkill: {
    id: 'skillsSection.openSkill',
    defaultMessage: 'Open {name} for editing',
  },
  backToSkills: {
    id: 'skillsSection.backToSkills',
    defaultMessage: 'Back to skills',
  },
  editTitle: {
    id: 'skillsSection.editTitle',
    defaultMessage: 'Edit skill',
  },
  name: {
    id: 'skillsSection.name',
    defaultMessage: 'Name',
  },
  descriptionField: {
    id: 'skillsSection.descriptionField',
    defaultMessage: 'Description',
  },
  instructions: {
    id: 'skillsSection.instructions',
    defaultMessage: 'Instructions',
  },
  save: {
    id: 'skillsSection.save',
    defaultMessage: 'Save changes',
  },
  saved: {
    id: 'skillsSection.saved',
    defaultMessage: 'Skill saved.',
  },
  readOnly: {
    id: 'skillsSection.readOnly',
    defaultMessage: 'This skill is read-only.',
  },
});

type Skill = Pick<
  SourceEntry,
  'type' | 'name' | 'description' | 'content' | 'path' | 'global' | 'writable'
>;

export default function SkillsSection() {
  const intl = useIntl();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [editedName, setEditedName] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const sources = await listSkillSources(getInitialWorkingDir());
      setSkills(
        sources.map((source) => ({
          type: source.type,
          name: source.name,
          description: source.description,
          content: source.content,
          path: source.path,
          global: source.global,
          writable: source.writable,
        }))
      );
    } catch (error) {
      console.error('Failed to load skills:', error);
      setLoadError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openSkill = (skill: Skill) => {
    setSelectedSkill(skill);
    setEditedName(skill.name);
    setEditedDescription(skill.description);
    setEditedContent(skill.content);
    setSaveError(null);
    setSaveNotice(null);
  };

  const saveSkill = async () => {
    if (!selectedSkill || !selectedSkill.writable) return;
    setSaving(true);
    setSaveError(null);
    setSaveNotice(null);
    try {
      const client = await getAcpClient();
      const { source } = await client.sauron.sourcesUpdate_unstable({
        type: selectedSkill.type as SourceType,
        path: selectedSkill.path,
        name: editedName,
        description: editedDescription,
        content: editedContent,
      });
      const updated: Skill = {
        type: source.type,
        name: source.name,
        description: source.description,
        content: source.content,
        path: source.path,
        global: source.global,
        writable: source.writable,
      };
      setSkills((current) =>
        current.map((skill) => (skill.path === selectedSkill.path ? updated : skill))
      );
      setSelectedSkill(updated);
      setEditedName(updated.name);
      setEditedDescription(updated.description);
      setEditedContent(updated.content);
      setSaveNotice(intl.formatMessage(i18n.saved));
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section id="skills" className="space-y-4 pr-4">
      <Card className="p-2 pb-4">
        <CardHeader className="pb-0">
          <CardTitle>{intl.formatMessage(i18n.title)}</CardTitle>
          <CardDescription>{intl.formatMessage(i18n.description)}</CardDescription>
        </CardHeader>
      </Card>

      {selectedSkill ? (
        <Card data-testid="skill-editor">
          <CardHeader className="pb-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-fit"
              onClick={() => setSelectedSkill(null)}
            >
              <ArrowLeft className="mr-1 h-4 w-4" aria-hidden="true" />
              {intl.formatMessage(i18n.backToSkills)}
            </Button>
            <CardTitle className="flex items-center gap-2 text-base">
              <Pencil className="h-4 w-4 text-text-secondary" aria-hidden="true" />
              {intl.formatMessage(i18n.editTitle)}
            </CardTitle>
            <CardDescription>{selectedSkill.path}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 px-4">
            <label className="block space-y-1 text-sm text-text-primary">
              <span>{intl.formatMessage(i18n.name)}</span>
              <input
                className="w-full rounded-md border border-border-primary bg-background-primary px-3 py-2 text-sm"
                value={editedName}
                onChange={(event) => setEditedName(event.target.value)}
                disabled={!selectedSkill.writable || saving}
              />
            </label>
            <label className="block space-y-1 text-sm text-text-primary">
              <span>{intl.formatMessage(i18n.descriptionField)}</span>
              <input
                className="w-full rounded-md border border-border-primary bg-background-primary px-3 py-2 text-sm"
                value={editedDescription}
                onChange={(event) => setEditedDescription(event.target.value)}
                disabled={!selectedSkill.writable || saving}
              />
            </label>
            <label className="block space-y-1 text-sm text-text-primary">
              <span>{intl.formatMessage(i18n.instructions)}</span>
              <textarea
                className="min-h-64 w-full resize-y rounded-md border border-border-primary bg-background-primary px-3 py-2 font-mono text-xs leading-relaxed"
                value={editedContent}
                onChange={(event) => setEditedContent(event.target.value)}
                disabled={!selectedSkill.writable || saving}
              />
            </label>
            {!selectedSkill.writable && (
              <p className="text-sm text-text-secondary">{intl.formatMessage(i18n.readOnly)}</p>
            )}
            {saveError && (
              <p role="alert" className="text-sm text-red-500">
                {saveError}
              </p>
            )}
            {saveNotice && (
              <p role="status" className="text-sm text-green-600 dark:text-green-400">
                {saveNotice}
              </p>
            )}
            {selectedSkill.writable && (
              <Button type="button" onClick={saveSkill} disabled={saving || !editedName.trim()}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {intl.formatMessage(i18n.save)}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <Loader2 className="h-4 w-4 animate-spin" />
          {intl.formatMessage(i18n.loading)}
        </div>
      ) : loadError ? (
        <p className="text-sm text-red-500">
          {intl.formatMessage(i18n.loadFailed)}: {loadError}
        </p>
      ) : skills.length === 0 ? (
        <p className="text-sm text-text-secondary">{intl.formatMessage(i18n.empty)}</p>
      ) : (
        <div className="space-y-2">
          {skills.map((skill) => (
            <Card key={skill.name} data-testid={`skill-${skill.name}`}>
              <CardContent className="px-4 py-3">
                <button
                  type="button"
                  className="w-full rounded-md text-left outline-none transition-colors hover:bg-background-tertiary/50 focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => openSkill(skill)}
                  aria-label={intl.formatMessage(i18n.openSkill, { name: skill.name })}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-text-primary">{skill.name}</h3>
                    <span className="rounded-full bg-background-tertiary px-2 py-0.5 text-xs text-text-secondary">
                      {intl.formatMessage(skill.global ? i18n.globalScope : i18n.projectScope)}
                    </span>
                    <Pencil
                      className="ml-auto h-3.5 w-3.5 text-text-secondary"
                      aria-hidden="true"
                    />
                  </div>
                  <p className="mt-1 text-xs text-text-secondary">{skill.description}</p>
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
