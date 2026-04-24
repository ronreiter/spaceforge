import {
  Anchor,
  Badge,
  Box,
  Button,
  Card,
  Code,
  Container,
  Divider,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import {
  IconArrowRight,
  IconBrain,
  IconCode,
  IconCpu,
  IconFileZip,
  IconForms,
  IconLayoutGrid,
  IconMarkdown,
  IconPlayerPlay,
  IconRocket,
  IconShield,
  IconSparkles,
  IconTemplate,
  IconWorld,
} from '@tabler/icons-react';
import { getCurrentUser } from '../lib/auth';

// Public marketing page. Rendered server-side. Signed-in users get a
// dashboard CTA; signed-out users get a sign-in CTA. Everything else is
// the same static pitch.

export const dynamic = 'force-dynamic';

export default async function Home() {
  const user = await getCurrentUser().catch(() => null);
  const signedIn = !!user;
  const ctaHref = signedIn ? '/dashboard' : '/sign-in';
  const ctaLabel = signedIn ? 'Open your dashboard' : 'Open the editor';

  return (
    <Box bg="dark.9" mih="100vh" c="gray.0">
      <LandingHeader signedIn={signedIn} />
      <Hero ctaHref={ctaHref} ctaLabel={ctaLabel} />
      <Features />
      <HowItWorks />
      <Protocol />
      <FinalCta ctaHref={ctaHref} ctaLabel={ctaLabel} />
      <LandingFooter />
    </Box>
  );
}

function LandingHeader({ signedIn }: { signedIn: boolean }) {
  return (
    <Container size="xl" py="md">
      <Group justify="space-between" wrap="nowrap">
        <Group gap={8} wrap="nowrap" align="center">
          <IconRocket size={24} stroke={1.8} color="var(--mantine-color-neon-3)" />
          <Text fw={700} size="md">
            Spaceforge
          </Text>
        </Group>
        <Group gap="sm" wrap="nowrap">
          <Anchor
            href="https://github.com/ronreiter/spaceforge"
            c="dimmed"
            size="sm"
            visibleFrom="sm"
          >
            <Group gap={4} wrap="nowrap">
              <IconCode size={14} />
              GitHub
            </Group>
          </Anchor>
          <Button
            component="a"
            href={signedIn ? '/dashboard' : '/sign-in'}
            size="xs"
            variant="default"
          >
            {signedIn ? 'Dashboard' : 'Sign in'}
          </Button>
        </Group>
      </Group>
    </Container>
  );
}

function Hero({ ctaHref, ctaLabel }: { ctaHref: string; ctaLabel: string }) {
  return (
    <Container size="xl" py={{ base: 64, sm: 96 }}>
      <Stack align="center" gap="xl" maw={820} mx="auto" ta="center">
        <Badge
          size="lg"
          variant="light"
          color="neon"
          leftSection={<IconCpu size={12} />}
          radius="sm"
        >
          Runs locally in your browser via WebGPU
        </Badge>

        <Title
          order={1}
          fz={{ base: 40, sm: 56, md: 64 }}
          fw={800}
          lh={1.05}
          style={{ letterSpacing: '-0.02em' }}
        >
          Build a website in your browser.
          <br />
          <Text
            span
            inherit
            c="neon.3"
            style={{ letterSpacing: '-0.02em' }}
          >
            No cloud. No API keys.
          </Text>
        </Title>

        <Text size="xl" c="gray.4" maw={640}>
          Spaceforge is an AI site builder that runs a language model inside
          Chrome on your own GPU. Your prompts never leave your machine. The
          output is plain HTML, CSS, and Markdown — yours to host anywhere.
        </Text>

        <Group gap="sm" mt="md">
          <Button
            component="a"
            href={ctaHref}
            size="lg"
            color="neon"
            rightSection={<IconArrowRight size={18} />}
          >
            {ctaLabel}
          </Button>
          <Button
            component="a"
            href="#how-it-works"
            size="lg"
            variant="default"
            leftSection={<IconPlayerPlay size={16} />}
          >
            See it run
          </Button>
        </Group>

        <Group gap="lg" mt="xl" c="dimmed" justify="center" wrap="wrap">
          <Group gap={6} wrap="nowrap">
            <IconShield size={14} />
            <Text size="xs">Zero data leaves your browser</Text>
          </Group>
          <Group gap={6} wrap="nowrap">
            <IconFileZip size={14} />
            <Text size="xs">Download as a zip</Text>
          </Group>
          <Group gap={6} wrap="nowrap">
            <IconTemplate size={14} />
            <Text size="xs">11ty-style Markdown + Nunjucks</Text>
          </Group>
        </Group>
      </Stack>
    </Container>
  );
}

function Features() {
  const items = [
    {
      icon: IconBrain,
      title: 'Local-first AI',
      body: 'Gemma or Qwen, ONNX-quantized, running on your GPU through transformers.js and WebGPU. Multi-gigabyte weights cache once, then everything runs offline.',
    },
    {
      icon: IconFileZip,
      title: 'Output you own',
      body: 'Flat Markdown + Nunjucks layouts. Preview in-browser, publish to /s/<slug>, or download a zip and drop it on any static host. No proprietary format, no lock-in.',
    },
    {
      icon: IconSparkles,
      title: 'Batteries included',
      body: 'Pico.css, Tabler icons, Google Fonts, and an Unsplash proxy are injected into every preview automatically. Sites look good before you touch styles.css.',
    },
    {
      icon: IconForms,
      title: 'Forms, built in',
      body: 'Drop a <form> into any page and submissions land in your dashboard. Export to CSV, forward to a webhook, or get emailed on every new one — no backend to wire up.',
    },
    {
      icon: IconLayoutGrid,
      title: 'Template gallery',
      body: 'Sixteen hand-crafted styles — editorial, brutalist, riviera, vault, synthwave, paper, and more. The agent picks the best match for your brief; swap any time without losing your content.',
    },
    {
      icon: IconWorld,
      title: 'Your own domain',
      body: 'Publish to /s/<slug> or point your own domain at the site with a single DNS record. Multi-domain per site, zero config to add one; TLS terminates at the platform.',
    },
  ];

  return (
    <Box py={{ base: 48, sm: 80 }} bg="dark.8">
      <Container size="xl">
        <Stack gap="xs" mb="xl" maw={720}>
          <Text size="xs" c="neon.3" fw={600} tt="uppercase" style={{ letterSpacing: '0.08em' }}>
            Why Spaceforge
          </Text>
          <Title order={2} fz={{ base: 28, sm: 36 }} fw={700} lh={1.15}>
            An AI builder that respects your machine and your files.
          </Title>
        </Stack>

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
          {items.map((it) => (
            <Card
              key={it.title}
              withBorder
              padding="lg"
              radius="md"
              bg="dark.7"
              style={{ borderColor: 'var(--mantine-color-dark-5)' }}
            >
              <Stack gap="sm">
                <Box
                  w={40}
                  h={40}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 8,
                    background: 'var(--mantine-color-dark-5)',
                    color: 'var(--mantine-color-neon-3)',
                  }}
                >
                  <it.icon size={20} stroke={1.8} />
                </Box>
                <Title order={3} fz="lg" fw={600}>
                  {it.title}
                </Title>
                <Text size="sm" c="gray.4" lh={1.6}>
                  {it.body}
                </Text>
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      </Container>
    </Box>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: '01',
      title: 'Describe what you want',
      body: '"A bakery homepage with a menu and an about page." Plain language, one sentence is enough to start.',
    },
    {
      n: '02',
      title: 'The agent plans, writes, and reviews',
      body: 'A planner picks a template, an executor writes each file one at a time, a critic reviews the result and loops back with fixes. You watch it happen in real time.',
    },
    {
      n: '03',
      title: 'Preview, edit, publish',
      body: 'Sandboxed iframe preview, Monaco editor on every file, and a one-click publish to /s/<your-slug> — or download the whole thing as a zip and host it yourself.',
    },
  ];

  return (
    <Box py={{ base: 48, sm: 80 }} id="how-it-works">
      <Container size="xl">
        <Stack gap="xs" mb="xl" maw={720}>
          <Text size="xs" c="neon.3" fw={600} tt="uppercase" style={{ letterSpacing: '0.08em' }}>
            How it works
          </Text>
          <Title order={2} fz={{ base: 28, sm: 36 }} fw={700} lh={1.15}>
            From a sentence to a deployable site in under a minute.
          </Title>
        </Stack>

        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
          {steps.map((s) => (
            <Card
              key={s.n}
              withBorder
              padding="lg"
              radius="md"
              bg="dark.8"
              style={{ borderColor: 'var(--mantine-color-dark-5)' }}
            >
              <Stack gap="sm">
                <Text
                  ff="monospace"
                  size="xs"
                  c="neon.3"
                  fw={600}
                  style={{ letterSpacing: '0.1em' }}
                >
                  {s.n}
                </Text>
                <Title order={3} fz="lg" fw={600}>
                  {s.title}
                </Title>
                <Text size="sm" c="gray.4" lh={1.6}>
                  {s.body}
                </Text>
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      </Container>
    </Box>
  );
}

function Protocol() {
  return (
    <Box py={{ base: 48, sm: 80 }} bg="dark.8">
      <Container size="xl">
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing={{ base: 'xl', md: 48 }}>
          <Stack gap="sm">
            <Text size="xs" c="neon.3" fw={600} tt="uppercase" style={{ letterSpacing: '0.08em' }}>
              Under the hood
            </Text>
            <Title order={2} fz={{ base: 28, sm: 36 }} fw={700} lh={1.15}>
              It's Markdown all the way down.
            </Title>
            <Text size="sm" c="gray.4" lh={1.6}>
              Every page in a Spaceforge site is a plain Markdown file with a
              YAML front matter header. Layouts are Nunjucks partials the
              template picks up. That's the entire contract — no bundler, no
              framework scaffolding, no proprietary state. Open any file in
              the editor or hand-write it yourself; it renders the same way.
            </Text>
            <Text size="sm" c="gray.4" lh={1.6}>
              Pick a starting point from the{' '}
              <Text span fw={600} c="gray.2">
                template gallery
              </Text>{' '}
              — sixteen hand-crafted looks from editorial to synthwave. The
              gallery is a set of layouts + styles.css bundles that overlay
              your Markdown; switching templates keeps every post and page
              exactly where you wrote them.
            </Text>
            <Stack gap={6} mt="sm">
              <StackBullet icon={IconCpu} label="transformers.js + WebGPU (runs in your browser)" />
              <StackBullet icon={IconMarkdown} label="Markdown pages with YAML front matter" />
              <StackBullet icon={IconLayoutGrid} label="16 template bundles in the gallery" />
              <StackBullet icon={IconTemplate} label="Nunjucks layouts (11ty-style)" />
            </Stack>
          </Stack>

          <Card
            withBorder
            padding="lg"
            radius="md"
            bg="dark.9"
            style={{ borderColor: 'var(--mantine-color-dark-5)' }}
          >
            <Text size="xs" c="dimmed" mb="xs" ff="monospace">
              posts/hello-world.md
            </Text>
            <Code block bg="transparent" c="gray.0" style={{ fontSize: 13 }}>
{`---
layout: _layout.njk
title: Our spring menu is here
date: 2026-04-12
tags: [menu, seasonal]
---

# Our spring menu is here

Fresh asparagus is finally back at the market, so
the menu tilts green for the next six weeks.

![A tray of grilled asparagus](/api/photo?q=asparagus,grilled&seed=3&w=1200&h=500)

## What's new

- **Asparagus fritters** with lemon aioli
- **Pea-and-mint risotto**, finished with pecorino
- A nettle soup that sounds like a dare, tastes like
  spring rain

See you Saturday.`}
            </Code>
          </Card>
        </SimpleGrid>
      </Container>
    </Box>
  );
}

function StackBullet({
  icon: Icon,
  label,
}: {
  icon: typeof IconRocket;
  label: string;
}) {
  return (
    <Group gap={8} wrap="nowrap">
      <Icon size={14} color="var(--mantine-color-neon-3)" />
      <Text size="sm" c="gray.3">
        {label}
      </Text>
    </Group>
  );
}

function FinalCta({ ctaHref, ctaLabel }: { ctaHref: string; ctaLabel: string }) {
  return (
    <Box py={{ base: 64, sm: 96 }}>
      <Container size="md">
        <Card
          withBorder
          padding={{ base: 'xl', sm: 48 } as unknown as string}
          radius="md"
          bg="dark.8"
          style={{ borderColor: 'var(--mantine-color-neon-3)' }}
        >
          <Stack align="center" gap="md" ta="center">
            <Title order={2} fz={{ base: 28, sm: 36 }} fw={700} lh={1.15}>
              Start building.
            </Title>
            <Text c="gray.4" maw={520}>
              No credit card. Requires Chrome 134+ and roughly 3 GB of free RAM
              for the default model. First load downloads the weights; after
              that it runs offline.
            </Text>
            <Button
              component="a"
              href={ctaHref}
              size="lg"
              color="neon"
              rightSection={<IconArrowRight size={18} />}
              mt="sm"
            >
              {ctaLabel}
            </Button>
          </Stack>
        </Card>
      </Container>
    </Box>
  );
}

function LandingFooter() {
  return (
    <Box py="lg" style={{ borderTop: '1px solid var(--mantine-color-dark-6)' }}>
      <Container size="xl">
        <Group justify="space-between" wrap="wrap" gap="xs">
          <Group gap={6} wrap="nowrap">
            <IconRocket size={14} color="var(--mantine-color-neon-3)" />
            <Text size="xs" c="dimmed">
              Spaceforge — browser-local website builder
            </Text>
          </Group>
          <Group gap="md" wrap="nowrap">
            <Anchor
              href="https://github.com/ronreiter/spaceforge"
              c="dimmed"
              size="xs"
            >
              GitHub
            </Anchor>
            <Divider orientation="vertical" />
            <Anchor href="/sign-in" c="dimmed" size="xs">
              Sign in
            </Anchor>
          </Group>
        </Group>
      </Container>
    </Box>
  );
}
