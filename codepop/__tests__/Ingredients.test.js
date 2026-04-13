import { AddInOptions, sodaOptions, syrupOptions } from '../src/components/Ingredients';

describe('Ingredients options', () => {
  it('contains key soda options used by builders', () => {
    const sodaValues = sodaOptions.map((option) => option.value);
    expect(sodaValues).toContain('sprite');
    expect(sodaValues).toContain('coke');
    expect(sodaValues).toContain('mtn. dew');
  });

  it('contains key syrup and add-in options', () => {
    const syrupValues = syrupOptions.map((option) => option.value);
    const addInValues = AddInOptions.map((option) => option.value);

    expect(syrupValues).toContain('vanilla');
    expect(syrupValues).toContain('strawberry');
    expect(addInValues).toContain('cream');
    expect(addInValues).toContain('whip');
  });

  it('stores options with unique values per category', () => {
    const uniqueSodas = new Set(sodaOptions.map((option) => option.value));
    const uniqueSyrups = new Set(syrupOptions.map((option) => option.value));
    const uniqueAddIns = new Set(AddInOptions.map((option) => option.value));

    expect(uniqueSodas.size).toBe(sodaOptions.length);
    expect(uniqueSyrups.size).toBe(syrupOptions.length);
    expect(uniqueAddIns.size).toBe(AddInOptions.length);
  });
});
