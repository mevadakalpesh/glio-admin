import {describe,it,expect} from 'vitest';
import {formatJourneyDuration} from './journeyPresentation';
describe('journey duration',()=>{
 it('converts fractional hours and carries rounded minutes',()=>{
  expect(formatJourneyDuration('0.74',true)).toBe('44 min');
  expect(formatJourneyDuration('1.5',true)).toBe('1h 30 min');
  expect(formatJourneyDuration(119.9)).toBe('2h');
 });
 it('keeps missing values distinct from zero',()=>{
  for(const value of [undefined,null,'',-1,'invalid'])expect(formatJourneyDuration(value)).toBe('Not recorded');
  expect(formatJourneyDuration(0)).toBe('0 min');
 });
});
