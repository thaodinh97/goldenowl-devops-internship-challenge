module.exports = async ({ github, context, core }) => {
    const fs = require('fs');
    const path = require('path');

    const root = process.env.GITHUB_WORKSPACE;
    const marker = '<!-- trivy-image-report -->';
    const runUrl =
        `${process.env.GITHUB_SERVER_URL}/${context.repo.owner}/` +
        `${context.repo.repo}/actions/runs/${context.runId}`;
    const levels = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'];

    let report;
    let scanError;

    try {
        if (process.env.TRIVY_OUTCOME !== 'success') {
        throw new Error('Trivy did not complete successfully.');
        }

        report = JSON.parse(
        fs.readFileSync(path.join(root, 'trivy-results.json'), 'utf8')
        );

        if (
        report.SchemaVersion !== 2 ||
        !report.ArtifactName ||
        !Array.isArray(report.Results)
        ) {
        throw new Error('The Trivy report is missing or invalid.');
        }
    } catch (error) {
        scanError = error.message;
    }

    let body = [
        marker,
        '## Trivy image scan',
        '',
        `Image: \`app:ci\``,
        `Workflow commit: \`${context.sha}\``,
        `Run: [View scan logs and artifacts](${runUrl})`,
        ''
    ].join('\n');

    if (scanError) {
        core.warning(`Trivy scan failed: ${scanError}`);
        body += [
        '⚠️ **SCAN FAILED — vulnerability status is unknown.**',
        '',
        'The scanner failed or did not produce a valid report.',
        'See the scan logs. This scan does not block deployment.'
        ].join('\n');
    } else {
        const findings = report.Results.flatMap(result =>
        (result.Vulnerabilities || []).map(v => ({
            ...v,
            target: result.Target
        }))
        );

        const counts = Object.fromEntries(levels.map(level => [level, 0]));
        for (const v of findings) {
        const level = levels.includes(v.Severity) ? v.Severity : 'UNKNOWN';
        counts[level]++;
        }

        const status = counts.CRITICAL
        ? '🔴 Critical vulnerabilities detected'
        : counts.HIGH
            ? '🟠 High vulnerabilities detected'
            : findings.length
            ? '🟡 Vulnerabilities detected'
            : '🟢 No vulnerabilities detected by this scan';

        body += [
        `**${status}**`,
        '',
        '| Severity | Findings |',
        '|---|---:|',
        ...levels.map(level => `| ${level} | ${counts[level]} |`),
        '',
        'Counts represent findings across scanned targets, not unique CVEs.',
        'This scan is advisory and does not block deployment.',
        ''
        ].join('\n');

        const cell = value => String(value ?? '')
        .replace(/[<>&|`\r\n]/g, ' ')
        .slice(0, 160);

        const top = [...findings]
        .sort((a, b) =>
            levels.indexOf(a.Severity) - levels.indexOf(b.Severity)
        )
        .slice(0, 10);

        if (top.length) {
        body += [
            '',
            '<details>',
            '<summary>View up to 10 findings</summary>',
            '',
            '| Severity | ID | Package | Installed | Fixed |',
            '|---|---|---|---|---|',
            ...top.map(v =>
            `| ${cell(v.Severity)} | ${cell(v.VulnerabilityID)} ` +
            `| ${cell(v.PkgName)} | ${cell(v.InstalledVersion)} ` +
            `| ${cell(v.FixedVersion || 'Not available')} |`
            ),
            '',
            '</details>',
            '',
            'Download the `trivy-report` artifact for the full JSON report.'
        ].join('\n');
        }
    }

    fs.writeFileSync(path.join(root, 'trivy-summary.md'), body);
    await core.summary.addRaw(body).write();

    const pr = context.payload.pull_request;
    if (
        context.eventName !== 'pull_request' ||
        !pr ||
        pr.head.repo.full_name !== `${context.repo.owner}/${context.repo.repo}` ||
        context.actor === 'dependabot[bot]'
    ) {
        core.info('PR comment skipped; report is available in the run summary.');
        return;
    }

    try {
        const { data: current } = await github.rest.pulls.get({
        ...context.repo,
        pull_number: pr.number
        });

        if (
        current.state !== 'open' ||
        current.head.sha !== pr.head.sha
        ) {
        core.info('PR changed or closed; skipping outdated comment.');
        return;
        }

        const comments = await github.paginate(
        github.rest.issues.listComments,
        {
            ...context.repo,
            issue_number: pr.number,
            per_page: 100
        }
        );

        const previous = comments.find(comment =>
        comment.user?.login === 'github-actions[bot]' &&
        comment.body?.includes(marker)
        );

        if (previous) {
        await github.rest.issues.updateComment({
            ...context.repo,
            comment_id: previous.id,
            body
        });
        } else {
        await github.rest.issues.createComment({
            ...context.repo,
            issue_number: pr.number,
            body
        });
        }
    } catch (error) {
        core.warning(`Could not post PR comment: ${error.message}`);
    }
};