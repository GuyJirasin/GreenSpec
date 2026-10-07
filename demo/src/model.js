import { recommendations } from './data.js';

export const money = value => '฿' + Math.round(value).toLocaleString('en-US');
export const carbon = value => value.toLocaleString('en-US', { maximumFractionDigits: 1 }) + ' tCO₂e';
export const selectedChanges = selections => recommendations.filter(item => selections[item.id]);
export function optionImpact(item, option = 'A') {
  return { carbon: item.cut * (option === 'B' ? 1.25 : 1), savings: option === 'B' ? -item.cost * 0.02 : item.save };
}
export function aggregateImpact(selections) {
  return selectedChanges(selections).reduce((result, item) => {
    const impact = optionImpact(item, selections[item.id]);
    return { carbon: result.carbon + impact.carbon, savings: result.savings + impact.savings };
  }, { carbon: 0, savings: 0 });
}
export const needsReview = (item, option) => item.check === 'Review' || option === 'B';
export const canAccept = item => item.check !== 'Fail';
export function validateFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (!['pdf', 'docx', 'xlsx', 'ifc', 'dwg'].includes(ext)) return 'Unsupported file type';
  if (file.size > 25 * 1048576) return 'File exceeds 25 MB';
  return null;
}
