import prisma from '../config/db';

export async function detectProjectSimilarity(
  newProjectTitle: string,
  newProjectAbstract: string,
  excludeProjectId?: string
) {
  const existingProjects = await prisma.project.findMany({
    where: {
      status: { in: ['PUBLISHED', 'COMPLETED', 'PENDING'] },
      ...(excludeProjectId ? { project_id: { not: excludeProjectId } } : {})
    },
    select: {
      project_id: true,
      title: true,
      abstract: true,
      domain: true,
      status: true
    }
  });

  const tokenize = (text: string) =>
    new Set(
      text
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 3)
    );

  const targetTokens = tokenize(`${newProjectTitle} ${newProjectAbstract}`);

  const similarities = existingProjects.map(proj => {
    const projTokens = tokenize(`${proj.title} ${proj.abstract}`);
    let intersection = 0;
    for (const token of targetTokens) {
      if (projTokens.has(token)) {
        intersection++;
      }
    }
    const union = new Set([...targetTokens, ...projTokens]).size;
    const jaccardScore = union === 0 ? 0 : Math.round((intersection / union) * 100);

    return {
      project_id: proj.project_id,
      title: proj.title,
      domain: proj.domain,
      status: proj.status,
      similarityPercentage: jaccardScore
    };
  });

  const highestMatch = similarities
    .filter(s => s.similarityPercentage > 20)
    .sort((a, b) => b.similarityPercentage - a.similarityPercentage);

  return {
    isHighRiskDuplicate: highestMatch.some(m => m.similarityPercentage >= 70),
    matches: highestMatch
  };
}
