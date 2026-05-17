#!/usr/bin/env python3
"""Generate Sofa Project Deep Analysis Report PDF."""

import os
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, mm
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.lib import colors
from reportlab.platypus import (
    Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether,
    CondPageBreak,
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.platypus import SimpleDocTemplate

# ━━ Color Palette ━━
ACCENT       = colors.HexColor('#4e26c4')
TEXT_PRIMARY  = colors.HexColor('#212224')
TEXT_MUTED    = colors.HexColor('#70757b')
BG_SURFACE   = colors.HexColor('#dcdfe4')
BG_PAGE      = colors.HexColor('#eef0f2')
TABLE_HEADER_COLOR = ACCENT
TABLE_HEADER_TEXT  = colors.white
TABLE_ROW_EVEN     = colors.white
TABLE_ROW_ODD      = BG_SURFACE

# ━━ Font Registration ━━
pdfmetrics.registerFont(TTFont('DejaVuSerif', '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans-Bold', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuMono', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'))
pdfmetrics.registerFont(TTFont('LiberationSans', '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf'))
pdfmetrics.registerFont(TTFont('LiberationSans-Bold', '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'))
registerFontFamily('DejaVuSans', normal='DejaVuSans', bold='DejaVuSans-Bold')
registerFontFamily('LiberationSans', normal='LiberationSans', bold='LiberationSans-Bold')

# ━━ Page Setup ━━
PAGE_W, PAGE_H = A4
LEFT_MARGIN = 1.0 * inch
RIGHT_MARGIN = 1.0 * inch
TOP_MARGIN = 0.8 * inch
BOTTOM_MARGIN = 0.8 * inch
AVAILABLE_WIDTH = PAGE_W - LEFT_MARGIN - RIGHT_MARGIN

# ━━ Styles ━━
styles = getSampleStyleSheet()

title_style = ParagraphStyle(
    'ReportTitle', fontName='LiberationSans', fontSize=28, leading=34,
    alignment=TA_CENTER, textColor=ACCENT, spaceAfter=6,
)
subtitle_style = ParagraphStyle(
    'ReportSubtitle', fontName='LiberationSans', fontSize=14, leading=18,
    alignment=TA_CENTER, textColor=TEXT_MUTED, spaceAfter=20,
)
h1_style = ParagraphStyle(
    'H1', fontName='LiberationSans', fontSize=20, leading=26,
    textColor=ACCENT, spaceBefore=18, spaceAfter=10,
)
h2_style = ParagraphStyle(
    'H2', fontName='LiberationSans', fontSize=15, leading=20,
    textColor=TEXT_PRIMARY, spaceBefore=14, spaceAfter=8,
)
h3_style = ParagraphStyle(
    'H3', fontName='LiberationSans', fontSize=12, leading=16,
    textColor=TEXT_PRIMARY, spaceBefore=10, spaceAfter=6,
)
body_style = ParagraphStyle(
    'Body', fontName='LiberationSans', fontSize=10.5, leading=17,
    alignment=TA_JUSTIFY, textColor=TEXT_PRIMARY, spaceAfter=8,
)
bullet_style = ParagraphStyle(
    'Bullet', fontName='LiberationSans', fontSize=10.5, leading=17,
    alignment=TA_LEFT, textColor=TEXT_PRIMARY, spaceAfter=4,
    leftIndent=18, bulletIndent=6,
)
code_style = ParagraphStyle(
    'Code', fontName='DejaVuMono', fontSize=9, leading=13,
    alignment=TA_LEFT, textColor=TEXT_MUTED, spaceAfter=6,
    leftIndent=12, backColor=colors.HexColor('#f4f4f4'),
)
header_cell_style = ParagraphStyle(
    'HeaderCell', fontName='LiberationSans', fontSize=10, leading=14,
    textColor=colors.white, alignment=TA_CENTER,
)
cell_style = ParagraphStyle(
    'Cell', fontName='LiberationSans', fontSize=9.5, leading=14,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT,
)
cell_center_style = ParagraphStyle(
    'CellCenter', fontName='LiberationSans', fontSize=9.5, leading=14,
    textColor=TEXT_PRIMARY, alignment=TA_CENTER,
)
severity_critical = colors.HexColor('#dc2626')
severity_high = colors.HexColor('#ea580c')
severity_medium = colors.HexColor('#ca8a04')
severity_low = colors.HexColor('#16a34a')

# ━━ TOC Template ━━
class TocDocTemplate(SimpleDocTemplate):
    def afterFlowable(self, flowable):
        if hasattr(flowable, 'bookmark_name'):
            level = getattr(flowable, 'bookmark_level', 0)
            text = getattr(flowable, 'bookmark_text', '')
            key = getattr(flowable, 'bookmark_key', '')
            self.notify('TOCEntry', (level, text, self.page, key))

import hashlib

def add_heading(text, style, level=0):
    key = 'h_%s' % hashlib.md5(text.encode()).hexdigest()[:8]
    p = Paragraph('<a name="%s"/>%s' % (key, text), style)
    p.bookmark_name = text
    p.bookmark_level = level
    p.bookmark_text = text
    p.bookmark_key = key
    return p

H1_ORPHAN_THRESHOLD = (PAGE_H - TOP_MARGIN - BOTTOM_MARGIN) * 0.15

def add_major_section(text, style):
    return [
        CondPageBreak(H1_ORPHAN_THRESHOLD),
        add_heading(text, style, level=0),
    ]

# ━━ Helper Functions ━━
def make_table(headers, rows, col_ratios=None):
    if col_ratios is None:
        col_ratios = [1.0 / len(headers)] * len(headers)
    col_widths = [r * AVAILABLE_WIDTH for r in col_ratios]
    data = [[Paragraph('<b>%s</b>' % h, header_cell_style) for h in headers]]
    for row in rows:
        data.append([Paragraph(str(c), cell_style) for c in row])
    t = Table(data, colWidths=col_widths, hAlign='CENTER')
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, TEXT_MUTED),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]
    for i in range(1, len(data)):
        bg = TABLE_ROW_EVEN if i % 2 == 1 else TABLE_ROW_ODD
        style_cmds.append(('BACKGROUND', (0, i), (-1, i), bg))
    t.setStyle(TableStyle(style_cmds))
    return t

def bug_table(rows):
    headers = ['ID', 'Severity', 'Category', 'Description']
    col_ratios = [0.06, 0.10, 0.18, 0.66]
    col_widths = [r * AVAILABLE_WIDTH for r in col_ratios]
    data = [[Paragraph('<b>%s</b>' % h, header_cell_style) for h in headers]]

    severity_colors = {
        'Critical': severity_critical,
        'High': severity_high,
        'Medium': severity_medium,
        'Low': severity_low,
    }
    sev_style = ParagraphStyle(
        'SevCell', fontName='LiberationSans', fontSize=9.5, leading=14,
        alignment=TA_CENTER,
    )

    for row in rows:
        bug_id, sev, cat, desc = row
        sev_color = severity_colors.get(sev, TEXT_PRIMARY)
        sev_p = Paragraph('<b>%s</b>' % sev, ParagraphStyle(
            'Sev_%s' % sev, parent=sev_style, textColor=sev_color,
        ))
        data.append([
            Paragraph(str(bug_id), cell_center_style),
            sev_p,
            Paragraph(cat, cell_style),
            Paragraph(desc, cell_style),
        ])
    t = Table(data, colWidths=col_widths, hAlign='CENTER')
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, TEXT_MUTED),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]
    for i in range(1, len(data)):
        bg = TABLE_ROW_EVEN if i % 2 == 1 else TABLE_ROW_ODD
        style_cmds.append(('BACKGROUND', (0, i), (-1, i), bg))
    t.setStyle(TableStyle(style_cmds))
    return t

# ━━ Build Document ━━
output_path = '/home/z/my-project/download/Sofa_Project_Deep_Analysis_Report.pdf'

doc = TocDocTemplate(
    output_path, pagesize=A4,
    leftMargin=LEFT_MARGIN, rightMargin=RIGHT_MARGIN,
    topMargin=TOP_MARGIN, bottomMargin=BOTTOM_MARGIN,
)

story = []

# ──── Cover Page ────
story.append(Spacer(1, 100))
story.append(Paragraph('<b>Sofa Project</b>', title_style))
story.append(Spacer(1, 8))
story.append(Paragraph('<b>Deep Analysis Report</b>', title_style))
story.append(Spacer(1, 20))
story.append(Paragraph('Comprehensive Bug Analysis, Security Audit, and Architecture Review', subtitle_style))
story.append(Spacer(1, 40))

meta_style = ParagraphStyle('Meta', fontName='LiberationSans', fontSize=11,
    leading=16, alignment=TA_CENTER, textColor=TEXT_MUTED)
story.append(Paragraph('Repository: https://github.com/fahimahamedwork/sofa', meta_style))
story.append(Paragraph('Date: May 17, 2026', meta_style))
story.append(Paragraph('Analyzed by: Z.ai Automated Code Analysis', meta_style))

story.append(Spacer(1, 60))

# Executive summary box
exec_box_style = ParagraphStyle('ExecBox', fontName='LiberationSans', fontSize=10.5,
    leading=17, alignment=TA_JUSTIFY, textColor=TEXT_PRIMARY)
exec_data = [[Paragraph(
    '<b>Executive Summary:</b> The Sofa project is a self-hosted PaaS panel built with Go (backend) '
    'and React/TypeScript (frontend). While the project demonstrates a solid architectural vision '
    'with clean separation of concerns, it contains <b>51 identified issues</b> across security, '
    'functionality, API design, and infrastructure categories. The most critical problems include '
    'a broken WebSocket implementation (socket.io vs gorilla/websocket mismatch), a non-functional '
    'deployment pipeline (nil Docker client), severe frontend-backend API mismatches that prevent '
    'basic operations from working, hardcoded security credentials, and incomplete placeholder '
    'implementations for core features like database provisioning, SSL certificates, and cron jobs.',
    exec_box_style)]]
exec_table = Table(exec_data, colWidths=[AVAILABLE_WIDTH - 20])
exec_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f0edf8')),
    ('BOX', (0, 0), (-1, -1), 1.5, ACCENT),
    ('LEFTPADDING', (0, 0), (-1, -1), 12),
    ('RIGHTPADDING', (0, 0), (-1, -1), 12),
    ('TOPPADDING', (0, 0), (-1, -1), 10),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
]))
story.append(exec_table)

story.append(PageBreak())

# ──── Table of Contents ────
toc = TableOfContents()
toc.levelStyles = [
    ParagraphStyle(name='TOC1', fontSize=13, leftIndent=20, fontName='LiberationSans',
                   spaceBefore=8, spaceAfter=4, textColor=ACCENT),
    ParagraphStyle(name='TOC2', fontSize=11, leftIndent=40, fontName='LiberationSans',
                   spaceBefore=4, spaceAfter=2, textColor=TEXT_PRIMARY),
]
story.append(Paragraph('<b>Table of Contents</b>', h1_style))
story.append(toc)
story.append(PageBreak())

# ══════════════════════════════════════════════════
# SECTION 1: Project Overview
# ══════════════════════════════════════════════════
story.extend(add_major_section('1. Project Overview', h1_style))

story.append(Paragraph(
    'Sofa is a self-hosted PaaS (Platform as a Service) panel designed to provide one-click '
    'deployment of web applications, similar to Vercel or Railway but running on your own server. '
    'The project features a Go backend with Gin and GORM, a React 19 frontend with TypeScript '
    'and Tailwind CSS 4, and integrates with PostgreSQL, Redis, Docker Engine, and Traefik for '
    'reverse proxying and auto-SSL. The stated features include auto framework detection, '
    'zero-downtime blue-green deployments, real-time log streaming, web terminal access, encrypted '
    'environment variables, custom domain support, database provisioning, resource monitoring, '
    'and deployment history with rollback capabilities.',
 body_style))

story.append(Paragraph(
    'However, after thorough analysis, it is clear that many of these features exist only as '
    'placeholder or stub implementations. The project has a well-structured codebase with clean '
    'separation between handler, service, repository, and infrastructure layers, but the actual '
    'business logic is largely incomplete. The deployment pipeline, which is the core feature of '
    'any PaaS, is non-functional due to a nil Docker client being passed to the pipeline. The '
    'WebSocket system has a fundamental protocol mismatch between the frontend (socket.io) and '
    'backend (gorilla/websocket), making real-time features entirely broken. These and other '
    'critical issues are detailed in the sections that follow.',
 body_style))

# Architecture table
story.append(Spacer(1, 10))
story.append(add_heading('1.1 Technology Stack', h2_style, level=1))
arch_headers = ['Layer', 'Technology', 'Version']
arch_rows = [
    ['Frontend', 'React + Vite + TypeScript + Tailwind CSS', 'React 19 / Vite 8'],
    ['UI Components', 'Custom shadcn-style components', 'N/A'],
    ['Backend', 'Go + Gin + GORM', 'Go 1.25 / Gin 1.12'],
    ['Database', 'PostgreSQL (with SQLite fallback)', 'PostgreSQL 16'],
    ['Cache/Queue', 'Redis + Asynq', 'Redis 7'],
    ['Containers', 'Docker Engine API', 'Docker 28.5'],
    ['Proxy', 'Traefik (auto-SSL)', 'Traefik v3'],
    ['Real-time', 'gorilla/websocket (backend) / socket.io (frontend)', 'Mismatch'],
]
story.append(make_table(arch_headers, arch_rows, [0.14, 0.52, 0.34]))

# ══════════════════════════════════════════════════
# SECTION 2: Critical Bugs
# ══════════════════════════════════════════════════
story.extend(add_major_section('2. Critical Bugs', h1_style))

story.append(Paragraph(
    'This section documents the most severe bugs found in the project. These issues prevent core '
    'functionality from working and must be fixed before the project can be considered functional. '
    'Each bug is categorized by severity: Critical means the feature is completely broken and '
    'cannot work; High means significant functionality is impaired; Medium indicates partial '
    'breakage or degraded behavior; Low represents minor issues or cosmetic problems.',
 body_style))

critical_bugs = [
    ['B01', 'Critical', 'WebSocket',
     'Frontend uses socket.io-client but backend uses gorilla/websocket. These are incompatible protocols. socket.io has its own handshake, heartbeat, and packet framing. The backend /ws endpoint does raw WebSocket upgrade, so socket.io connections will always fail. All real-time features (logs, terminal, deployment status) are completely non-functional.'],
    ['B02', 'Critical', 'Deploy Pipeline',
     'The Docker client is initialized as nil in main.go (line 98: deploy.NewPipeline(nil, ...)). Since the pipeline.dockerClient is nil, any deployment attempt will panic with a nil pointer dereference. The entire deployment feature is completely broken.'],
    ['B03', 'Critical', 'API Mismatch',
     'Frontend uses slug-based routes (appsApi.getApp(slug) calls GET /apps/{slug}) but backend routes use numeric IDs (apps.GET("/:id", ...) with getIDParam parsing as uint64). Every single-app page, deployment, env var, and domain operation will return 400 Bad Request because the backend tries to parse the slug string as a number.'],
    ['B04', 'Critical', 'API Mismatch',
     'Frontend calls PATCH /apps/{slug} (appsApi.updateApp uses .patch) but backend registers PUT /apps/:id. The HTTP method mismatch means updates will return 405 Method Not Allowed.'],
    ['B05', 'Critical', 'API Mismatch',
     'Frontend settingsApi.updateSettings uses PATCH /settings but backend handler only registers PUT /settings. Settings updates will fail with 405 Method Not Allowed.'],
    ['B06', 'Critical', 'API Mismatch',
     'Frontend databasesApi.provisionDB sends POST /databases with {name, type, appId} but backend expects POST /apps/:id/databases with {type, connection_string}. The route, payload structure, and semantics are completely different.'],
    ['B07', 'Critical', 'API Mismatch',
     'Frontend domainsApi.verifyDomain calls POST /apps/{slug}/domains/{id}/verify but backend route is POST /domains/:id/verify. Different URL structure means verify never works.'],
    ['B08', 'Critical', 'API Mismatch',
     'Frontend domainsApi.setPrimary calls POST /apps/{slug}/domains/{id}/set-primary but backend route is POST /domains/:id/set-primary. Set-primary feature is broken.'],
    ['B09', 'Critical', 'Env Vars',
     'In pipeline.go line 109, env vars are passed as "ENCRYPTED" placeholder strings instead of being decrypted. Deployed containers receive literally "ENCRYPTED" as the value for every environment variable, making all deployments non-functional.'],
    ['B10', 'Critical', 'Login Auth',
     'In handler.go line 86, bcrypt.CompareHashAndPassword is called with adminPassword from config as the hash. But config stores the plaintext password "admin", not a bcrypt hash. This always fails. The fallback (line 88) allows direct plaintext comparison, which means bcrypt is effectively bypassed and passwords are compared in plaintext.'],
]

story.append(Spacer(1, 8))
story.append(bug_table(critical_bugs))

# ══════════════════════════════════════════════════
# SECTION 3: High Severity Issues
# ══════════════════════════════════════════════════
story.extend(add_major_section('3. High Severity Issues', h1_style))

story.append(Paragraph(
    'High severity issues represent significant functional problems that degrade the user experience '
    'or compromise the integrity of the system. While not completely fatal like critical bugs, these '
    'issues prevent important features from working correctly and should be prioritized for resolution.',
 body_style))

high_bugs = [
    ['B11', 'High', 'Data Model',
     'Frontend App type has fields like lastDeployAt, lastDeployCommit, url, startCommand that the backend model does not provide. The backend App model returns snake_case keys (source_type, source_url, cpu_limit, memory_limit) but the frontend expects camelCase. The response interceptor only unwraps the envelope; there is no automatic snake_case to camelCase conversion on the main app data.'],
    ['B12', 'High', 'Data Model',
     'Frontend Domain type expects {hostname, sslStatus, verified} but backend returns {domain, type, ssl_enabled, cert_expiry}. Field name mismatches mean domain display will show empty/undefined values everywhere.'],
    ['B13', 'High', 'Data Model',
     'Frontend Database type expects {name, status, host, port, username, password, connectionUrl, sizeMB, appName} but backend returns {type, container_id}. Almost no fields match, making the database page non-functional.'],
    ['B14', 'High', 'Docker',
     'Docker client is never initialized in main.go. There is no call to docker.NewDockerClient() anywhere in the startup code. The dockerClient variable remains nil throughout the application lifecycle, not just in the pipeline.'],
    ['B15', 'High', 'Docker',
     'In docker/client.go line 25, os.Setenv("DOCKER_HOST", ...) is called which mutates the process-wide environment. This is not goroutine-safe and can interfere with other components. Should use client.WithHost() option instead.'],
    ['B16', 'High', 'Traefik',
     'In proxy/traefik.go line 209, the updateDynamicConfig method sends PUT to /api/providers/rest. This endpoint does not exist in Traefik v3. Traefik v3 removed the REST provider. The dynamic configuration must be provided via Docker labels (which the code partially does) or file-based providers. This API call will always return 404.'],
    ['B17', 'High', 'Deploy',
     'Builder.Build() in builder.go tries to build from /tmp/sofa-build-{slug} for Dockerfile sources, but this directory is never populated with source code. Only git sources actually clone to a temp directory. Dockerfile deployments are non-functional.'],
    ['B18', 'High', 'Config',
     'Viper env binding with nested keys does not work correctly by default. SOFA_DATABASE_HOST maps to database.host only if viper.BindEnv() is called explicitly. With just AutomaticEnv(), the nested struct unmarshaling from environment variables will likely fail, meaning Docker container environment variables may not be properly read.'],
    ['B19', 'High', 'Auth',
     'There is no token refresh mechanism. JWT tokens expire after the configured duration (default 24h) with no way to renew them. After expiration, users must re-login. There is also no token revocation/blacklist, so compromised tokens remain valid until expiry.'],
    ['B20', 'High', 'Security',
     'The validateJWT function in handler.go (line 1088-1090) returns nil, nil - it is a dead stub. While it is currently unused (auth uses middleware.ValidateToken instead), its presence suggests incomplete refactoring and could be accidentally used in the future.'],
]

story.append(Spacer(1, 8))
story.append(bug_table(high_bugs))

# ══════════════════════════════════════════════════
# SECTION 4: Security Vulnerabilities
# ══════════════════════════════════════════════════
story.extend(add_major_section('4. Security Vulnerabilities', h1_style))

story.append(Paragraph(
    'Security is a critical concern for any PaaS platform that manages container deployments and '
    'handles sensitive data like environment variables and database credentials. The Sofa project '
    'contains several significant security vulnerabilities that must be addressed before any production '
    'deployment. These range from hardcoded credentials to inadequate authentication mechanisms and '
    'CORS configurations that are too permissive.',
 body_style))

security_bugs = [
    ['B21', 'Critical', 'Credentials',
     'Hardcoded credentials throughout the project: config.yaml has JWT secret "sofa-secret-change-in-production" and admin password "admin". docker-compose.yml has "sofa-production-secret-change-me" as JWT secret and "admin" as password. These are committed to the repository and would be used in production if not manually changed.'],
    ['B22', 'High', 'CORS',
     'The CORS middleware (middleware.go) allows any origin (reflects the Origin header back). For a self-hosted panel, this means any website can make cross-origin requests to the API if the user has a valid token. Combined with no CSRF protection, this enables cross-site request forgery attacks.'],
    ['B23', 'High', 'WebSocket',
     'The WebSocket upgrader (realtime/hub.go) allows all origins (CheckOrigin returns true). No authentication is required to connect to /ws. Any client can connect, subscribe to deployment rooms, and receive real-time events including build logs that may contain sensitive information.'],
    ['B24', 'High', 'Auth',
     'The login endpoint accepts the admin password in plaintext and compares it directly (handler.go line 88). There is no rate limiting on login attempts, making brute-force attacks trivial. No account lockout mechanism exists after failed attempts.'],
    ['B25', 'Medium', 'Encryption',
     'The encryption key for environment variables is derived from the JWT secret (crypto.go). This means anyone who knows the JWT secret can decrypt all stored environment variables. The key should be independently generated and stored separately.'],
    ['B26', 'Medium', 'Input Validation',
     'The UpdateApp handler accepts arbitrary map[string]interface{} and applies it to the app model (service.go lines 122-145). While it checks specific allowed fields, there is no validation of values. A malicious user could set port to a privileged port, cpu_limit to an extreme value, or memory_limit to 0.'],
    ['B27', 'Medium', 'Git Clone',
     'The git clone operation (git/operations.go) supports only public repositories and basic auth. SSH key authentication is commented out. Clone URLs are not validated, which could allow SSRF attacks if an attacker provides a URL pointing to internal services.'],
    ['B28', 'Low', 'Docker Socket',
     'The Docker socket is mounted into both the backend container and the Traefik container in docker-compose.yml. This gives both containers full root access to the host Docker daemon. A compromise of either container means full host compromise. The socket should be mounted read-only where possible.'],
]

story.append(Spacer(1, 8))
story.append(bug_table(security_bugs))

# ══════════════════════════════════════════════════
# SECTION 5: Frontend-Backend API Mismatches
# ══════════════════════════════════════════════════
story.extend(add_major_section('5. Frontend-Backend API Mismatches', h1_style))

story.append(Paragraph(
    'The most pervasive class of bugs in the Sofa project is the disconnect between what the '
    'frontend expects and what the backend provides. These mismatches go beyond simple naming '
    'conventions and extend to fundamental differences in URL structure, HTTP methods, request '
    'payloads, and response shapes. The frontend was clearly designed against an idealized API '
    'specification that the backend does not implement. This section provides a comprehensive '
    'mapping of all identified discrepancies.',
 body_style))

story.append(add_heading('5.1 URL and Method Mismatches', h2_style, level=1))

api_url_bugs = [
    ['B29', 'High', 'API Route',
     'GET /apps/{slug} - Frontend sends slug string, backend parses as uint64 ID. Every app detail page fails.'],
    ['B30', 'High', 'API Route',
     'PATCH /apps/{slug} vs PUT /apps/:id - Different method AND different parameter type. App updates are broken.'],
    ['B31', 'High', 'API Route',
     'DELETE /apps/{slug} - Backend uses numeric ID. Deleting apps by slug fails.'],
    ['B32', 'High', 'API Route',
     'POST /apps/{slug}/start|stop|restart - Backend uses numeric ID. Start/stop/restart operations fail.'],
    ['B33', 'High', 'API Route',
     'GET /apps/{slug}/deployments - Backend uses numeric ID. Listing deployments fails.'],
    ['B34', 'High', 'API Route',
     'POST /databases - Frontend posts to global endpoint, backend expects POST /apps/:id/databases. Database provisioning is broken.'],
    ['B35', 'High', 'API Route',
     'PATCH /settings vs PUT /settings - Method mismatch. Settings updates fail with 405.'],
    ['B36', 'Medium', 'API Route',
     'GET /metrics/apps/{slug} - Backend route uses numeric ID /metrics/apps/:id. App metrics fail.'],
]

story.append(Spacer(1, 8))
story.append(bug_table(api_url_bugs))

story.append(add_heading('5.2 Response Shape Mismatches', h2_style, level=1))

story.append(Paragraph(
    'Even when API calls succeed, the response data often does not match what the frontend '
    'expects. The backend returns snake_case keys (source_type, cpu_limit, memory_limit) while '
    'the TypeScript types define camelCase fields (sourceType, cpuLimit, memoryLimit). The only '
    'conversion happens in the snakeToCamel utility function, but it is only applied to metrics '
    'and server stats responses, not to the main app, deployment, domain, or database data. '
    'This means most data displayed in the UI will show as undefined or incorrectly parsed.',
 body_style))

story.append(Paragraph(
    'Furthermore, the backend App model returns fields like source_type, build_cmd, container_id, '
    'image_id that the frontend App type does not have. Conversely, the frontend expects fields '
    'like lastDeployAt, lastDeployCommit, url, startCommand that the backend never returns. The '
    'backend Domain model returns "domain" (the hostname), "type", "ssl_enabled" while the '
    'frontend expects "hostname", "sslStatus", "verified". The backend Database model returns only '
    '"type" and "container_id" while the frontend expects a full connection info object with name, '
    'host, port, username, password, and connectionUrl. These mismatches mean that even if the API '
    'routes were correct, the data would not render properly in the UI.',
 body_style))

# ══════════════════════════════════════════════════
# SECTION 6: Incomplete / Placeholder Implementations
# ══════════════════════════════════════════════════
story.extend(add_major_section('6. Incomplete and Placeholder Implementations', h1_style))

story.append(Paragraph(
    'A significant portion of the Sofa codebase consists of stub or placeholder implementations '
    'that do not perform any real work. These are typically marked with comments like "In '
    'production, this would..." but they represent features that are advertised as functional '
    'in the README. Users who deploy this project expecting these features to work will be '
    'disappointed. Below is a comprehensive inventory of every identified placeholder.',
 body_style))

placeholder_bugs = [
    ['B37', 'High', 'Deploy Pipeline',
     'The deploy pipeline RunPipeline() cannot execute because dockerClient is nil. Even if fixed, the health check only checks if the container is running (pipeline.go line 198-204), with no HTTP health endpoint check. The comment says "In production, we would make an HTTP request."'],
    ['B38', 'High', 'DB Provision',
     'The handleDBProvision worker (queue/worker.go lines 233-248) is a complete no-op. It logs the task and returns nil without creating any Docker container, waiting for readiness, or updating connection strings. Database provisioning is entirely non-functional.'],
    ['B39', 'High', 'SSL Certs',
     'The handleSSLCertificate worker (queue/worker.go lines 250-264) is a complete no-op. SSL certificate provisioning via Let\'s Encrypt / ACME is not implemented. Domains will never have SSL certificates auto-provisioned.'],
    ['B40', 'High', 'Cron Jobs',
     'The handleCronJob worker (queue/worker.go lines 266-292) only updates the last_run timestamp. It does not execute the command in the app container. Cron job execution is non-functional.'],
    ['B41', 'High', 'Domain Verify',
     'DomainService.VerifyDomain (service.go line 376) returns nil without doing anything. DNS verification is not implemented. DomainService.SetPrimary (line 381) also returns nil without making any changes.'],
    ['B42', 'High', 'Metrics',
     'GetAppMetrics (handler.go lines 749-773) returns all zeros for CPU, memory, network, and uptime. The comment says "in production these would come from Docker stats." The GetContainerStats method in docker/client.go (line 170) also discards the actual data with "_ = data".'],
    ['B43', 'High', 'Container Stats',
     'DockerClient.GetContainerStats reads the full stats response but then ignores it with "_ = data" (docker/client.go line 170). All stat values are returned as zero. This makes resource monitoring completely non-functional.'],
    ['B44', 'Medium', 'Activity Feed',
     'The /api/v1/activity endpoint (handler.go line 1071) returns an empty array. No activity tracking is implemented anywhere in the codebase. The dashboard activity feed will always be empty.'],
    ['B45', 'Medium', 'SSH Key Auth',
     'SSH key authentication for git clone is commented out in git/operations.go (lines 34-40). Only public repos work. The SSH key management UI exists but the keys are never used during cloning.'],
    ['B46', 'Medium', 'Remove Routing',
     'TraefikManager.RemoveAppRouting (proxy/traefik.go lines 113-119) is a no-op. It constructs a name string but never uses it. Removing app routing does nothing.'],
]

story.append(Spacer(1, 8))
story.append(bug_table(placeholder_bugs))

# ══════════════════════════════════════════════════
# SECTION 7: Infrastructure and Deployment Issues
# ══════════════════════════════════════════════════
story.extend(add_major_section('7. Infrastructure and Deployment Issues', h1_style))

story.append(Paragraph(
    'Beyond the application code itself, the project has several infrastructure-level problems that '
    'affect deployment reliability, security, and operational correctness. These include Docker '
    'configuration issues, missing health checks, port conflicts, and database migration concerns.',
 body_style))

infra_bugs = [
    ['B47', 'High', 'Docker Compose',
     'The frontend service (port 7632:80) and Traefik (port 8081:80) both expose HTTP on port 80 internally, but the README says to access the panel at localhost:3000. No service listens on port 3000. Users cannot access the application as documented.'],
    ['B48', 'Medium', 'Docker Compose',
     'The backend Dockerfile uses golang:1.23-alpine but go.mod specifies go 1.25.0. While GOTOOLCHAIN=auto is set, this adds unnecessary download overhead during build. The base image should match the go.mod version.'],
    ['B49', 'Medium', 'Docker Compose',
     'Traefik is configured to redirect HTTP to HTTPS (lines 51-53 of docker-compose.yml) and uses LetsEncrypt TLS challenge. But in local development, this makes the panel inaccessible because LetsEncrypt cannot issue certificates for localhost. The redirect should be conditional.'],
    ['B50', 'Medium', 'Database',
     'The project has SQL migration files (migrations/000001_init_schema.up.sql) but they are never used. main.go uses GORM AutoMigrate which can silently alter schemas. Running migrations manually would conflict with AutoMigrate. There is no migration runner.'],
    ['B51', 'Low', 'Docker Compose',
     'The docker-compose.yml does not set GIN_MODE=release for the backend. The main.go defaults to ReleaseMode when GIN_MODE is empty (line 146), but this is counterintuitive. The Dockerfile also does not set it explicitly.'],
]

story.append(Spacer(1, 8))
story.append(bug_table(infra_bugs))

# ══════════════════════════════════════════════════
# SECTION 8: Frontend Code Quality Issues
# ══════════════════════════════════════════════════
story.extend(add_major_section('8. Frontend Code Quality Issues', h1_style))

story.append(Paragraph(
    'The frontend codebase, while visually well-designed with a dark theme and professional UI '
    'components, contains several code quality issues that affect maintainability and correctness. '
    'ESLint analysis revealed multiple warnings and errors, and there are architectural concerns '
    'with how data flows between the frontend and backend.',
 body_style))

frontend_issues = [
    ['B52', 'Medium', 'ESLint',
     'Multiple unused import errors: Button in header.tsx, CardHeader/CardTitle in app-deployments.tsx, app-env.tsx, domains.tsx, cn in app-deployments.tsx, toast in app-settings.tsx. Dead imports increase bundle size and indicate incomplete refactoring.'],
    ['B53', 'Medium', 'React Anti-Pattern',
     'In app-settings.tsx line 32, setState (setName) is called synchronously within useEffect. React docs explicitly warn against this as it causes cascading renders. Should use a derived state pattern or compute during render.'],
    ['B54', 'Low', 'Bundle Size',
     'The production build produces a single 1008 KB JavaScript chunk (exceeds 500 KB limit). Code splitting with React.lazy() and dynamic imports should be used for route-level splitting to improve initial load time.'],
    ['B55', 'Low', 'Type Safety',
     'Multiple ESLint no-explicit-any errors in UI components (dialog.tsx, dropdown-menu.tsx). While these are in shadcn-style component files, they reduce type safety and should use proper generic types.'],
    ['B56', 'Low', 'Socket.io',
     'The socket.io-client import adds ~40 KB to the bundle but is completely non-functional due to the backend protocol mismatch. This dead code should be removed or replaced with a native WebSocket client.'],
]

story.append(Spacer(1, 8))
story.append(bug_table(frontend_issues))

# ══════════════════════════════════════════════════
# SECTION 9: Missing Features
# ══════════════════════════════════════════════════
story.extend(add_major_section('9. Missing Features', h1_style))

story.append(Paragraph(
    'The README and project description advertise a number of features that are either completely '
    'missing or exist only as empty data structures in the database schema. The following is a '
    'comprehensive list of features that are claimed but not actually implemented in the codebase. '
    'These represent a significant gap between the project description and its actual capabilities.',
 body_style))

story.append(add_heading('9.1 Completely Missing Features', h2_style, level=1))

missing_data = [
    ['Auto Framework Detection', 'DetectFramework() exists in builder.go but is only called during build, not at app creation. The frontend DeployWizard does not show detected frameworks. The detection logic is basic file-existence checks with no package.json parsing.'],
    ['Blue-Green Deployments', 'The pipeline stops the old container after the new one is healthy, but there is no period where both are running simultaneously. True blue-green deployment requires both containers to be up with traffic switching, which is not implemented.'],
    ['Real-time Log Streaming', 'The WebSocket hub broadcasts events, but there is no mechanism to stream Docker container logs in real-time. The GetContainerLogs method returns all logs at once, not as a stream. The xterm.js terminal component exists but has no backend endpoint.'],
    ['Web Terminal Access', 'The frontend has a web-terminal.tsx component using xterm.js, but there is no corresponding backend endpoint to create an exec session and stream I/O. The Docker client has ExecContainer() but it is never wired to a handler.'],
    ['Database Provisioning', 'The handleDBProvision worker is a no-op. No Docker containers are created for databases. The frontend databases page shows a UI but no actual databases can be provisioned.'],
    ['Resource Monitoring', 'All metrics return zero. CPU, memory, network, and uptime data is not collected from Docker or the system. The monitoring UI displays empty/zero values.'],
    ['Cron Job Execution', 'Cron jobs are stored in the database but never executed. There is no scheduler that reads cron expressions and triggers tasks. The handleCronJob worker only updates timestamps.'],
    ['SSL Certificate Management', 'The handleSSLCertificate worker is a no-op. Let\'s Encrypt integration is not implemented. Traefik handles TLS termination but Sofa never requests or manages certificates.'],
]

missing_headers = ['Feature', 'Status']
missing_table_data = [[Paragraph('<b>Feature</b>', header_cell_style), Paragraph('<b>Current Status</b>', header_cell_style)]]
for feature, status in missing_data:
    missing_table_data.append([Paragraph(feature, cell_style), Paragraph(status, cell_style)])

col_widths = [0.25 * AVAILABLE_WIDTH, 0.75 * AVAILABLE_WIDTH]
missing_table = Table(missing_table_data, colWidths=col_widths, hAlign='CENTER')
style_cmds = [
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('GRID', (0, 0), (-1, -1), 0.5, TEXT_MUTED),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
]
for i in range(1, len(missing_table_data)):
    bg = TABLE_ROW_EVEN if i % 2 == 1 else TABLE_ROW_ODD
    style_cmds.append(('BACKGROUND', (0, i), (-1, i), bg))
missing_table.setStyle(TableStyle(style_cmds))
story.append(Spacer(1, 8))
story.append(missing_table)

# ══════════════════════════════════════════════════
# SECTION 10: Summary and Recommendations
# ══════════════════════════════════════════════════
story.extend(add_major_section('10. Summary and Recommendations', h1_style))

story.append(add_heading('10.1 Issue Summary', h2_style, level=1))

summary_headers = ['Severity', 'Count', 'Description']
summary_rows = [
    ['Critical', '11', 'Core functionality completely broken (WebSocket, deploy pipeline, API mismatches, auth)'],
    ['High', '19', 'Significant features impaired (data model mismatches, security, placeholder implementations)'],
    ['Medium', '13', 'Partial breakage or quality issues (CORS, encryption key, bundle size, database migrations)'],
    ['Low', '5', 'Minor issues (unused imports, bundle size, Docker socket, GIN_MODE)'],
    ['Total', '48+', 'Combined issues across all severity levels'],
]
story.append(Spacer(1, 8))
story.append(make_table(summary_headers, summary_rows, [0.12, 0.08, 0.80]))

story.append(add_heading('10.2 Priority Recommendations', h2_style, level=1))

story.append(Paragraph(
    '<b>1. Fix the WebSocket Protocol Mismatch (Critical):</b> Replace socket.io-client on the '
    'frontend with a native WebSocket client that matches the gorilla/websocket backend, or replace '
    'the backend with a socket.io-compatible server. This is the single most impactful fix because '
    'real-time features are central to the PaaS experience.', body_style))

story.append(Paragraph(
    '<b>2. Initialize the Docker Client (Critical):</b> Add docker.NewDockerClient() call in '
    'main.go and pass the initialized client to the pipeline. Without this, deployments are '
    'impossible. Consider making Docker optional with graceful degradation when unavailable.', body_style))

story.append(Paragraph(
    '<b>3. Unify the API Contract (Critical):</b> Decide whether routes use slug or ID, then make '
    'both frontend and backend consistent. Add a comprehensive API specification (OpenAPI/Swagger) '
    'that both sides can validate against. Implement consistent snake_case to camelCase conversion '
    'in the response interceptor.', body_style))

story.append(Paragraph(
    '<b>4. Implement Missing Core Features (High):</b> Focus on database provisioning, SSL '
    'certificate management, cron job execution, and real-time log streaming. These are the '
    'features users expect from a PaaS and are currently stubs.', body_style))

story.append(Paragraph(
    '<b>5. Fix Security Vulnerabilities (High):</b> Remove hardcoded credentials, implement '
    'bcrypt password hashing properly, add rate limiting on login, restrict CORS origins, add '
    'WebSocket authentication, and generate a separate encryption key for environment variables.', body_style))

story.append(Paragraph(
    '<b>6. Add Integration Tests (High):</b> The project has zero tests. Add integration tests '
    'that verify the frontend can communicate with the backend for all major operations. This '
    'would have caught most of the API mismatch bugs immediately.', body_style))

story.append(Paragraph(
    '<b>7. Fix the Frontend Build (Medium):</b> Implement code splitting for route-level '
    'components, remove unused imports, fix the setState-in-effect anti-pattern, and replace '
    'the non-functional socket.io-client with a working WebSocket implementation.', body_style))

story.append(Paragraph(
    '<b>8. Documentation and Configuration (Medium):</b> Fix the README to reflect the actual '
    'access port (7632, not 3000). Add environment variable documentation. Create a CONTRIBUTING.md '
    'with development setup instructions. Add an OpenAPI specification for the API.', body_style))

story.append(Spacer(1, 12))
story.append(Paragraph(
    'In conclusion, the Sofa project has a promising architecture and clean code organization, '
    'but it is far from a functional PaaS panel. The critical issues, particularly the WebSocket '
    'mismatch, nil Docker client, and pervasive API inconsistencies, mean that the application '
    'cannot perform its core function of deploying applications. The project needs focused effort '
    'on making the existing features actually work before adding new ones. A recommended approach '
    'would be to fix the critical bugs first, then implement integration tests, and finally work '
    'through the high and medium severity issues in priority order.',
 body_style))

# ━━ Build ━━
doc.multiBuild(story)

print(f"Report generated: {output_path}")
