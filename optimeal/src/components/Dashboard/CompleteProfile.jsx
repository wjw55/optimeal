import React, { useState } from 'react';
import { deleteField, doc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../auth/firebase';
import {
  ALLERGY_OPTIONS,
  APPLIANCE_OPTIONS,
  CUISINE_OPTIONS,
  DIET_TYPES,
  buildProfileForSave,
  normalizeProfile,
  toggleValue,
  validateProfile
} from '../../utils/profileUtils';
import './CompleteProfile.css';

function CompleteProfile() {
  const [profile, setProfile] = useState(() => normalizeProfile({}));
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const updateProfileField = (field, value) => {
    setProfile((current) => ({ ...current, [field]: value }));
  };

  const toggleProfileArrayValue = (field, value) => {
    setProfile((current) => ({
      ...current,
      [field]: toggleValue(current[field] || [], value)
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    const user = auth.currentUser;
    if (!user) return;

    const validation = validateProfile(profile);
    if (!validation.valid) {
      setError(validation.message);
      return;
    }

    const profileForSave = buildProfileForSave(profile);
    await setDoc(doc(db, 'users', user.uid), {
      ...profileForSave,
      height: deleteField(),
      weight: deleteField()
    }, { merge: true });

    navigate('/dashboard');
  };

  return (
    <main className="complete-profile">
      <section className="complete-profile__card">
        <p className="complete-profile__kicker">A better meal plan starts here</p>
        <h1>Complete your profile</h1>
        <p className="complete-profile__intro">
          These preferences help Optimeal shape meals, nutrition targets, and grocery lists around your week.
        </p>

        {error && <div className="complete-profile__error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="complete-profile__section-heading">
            <h2>Basic info</h2>
            <p>Used only to estimate meal targets and keep your plan organized.</p>
          </div>
          <label>
            Username
            <input value={profile.username} onChange={(event) => updateProfileField('username', event.target.value)} required />
          </label>

          <div className="complete-profile__grid">
            <label>
              Age
              <input type="number" min="13" value={profile.age} onChange={(event) => updateProfileField('age', event.target.value)} required />
            </label>
            <label>
              Sex
              <select value={profile.sex} onChange={(event) => updateProfileField('sex', event.target.value)}>
                <option>Prefer not to say</option>
                <option>Female</option>
                <option>Male</option>
                <option>Other</option>
              </select>
            </label>
            <label>
              Height (cm)
              <input type="number" min="80" value={profile.heightCm} onChange={(event) => updateProfileField('heightCm', event.target.value)} required />
            </label>
            <label>
              Weight (kg)
              <input type="number" min="20" value={profile.weightKg} onChange={(event) => updateProfileField('weightKg', event.target.value)} required />
            </label>
          </div>

          <div className="complete-profile__section-heading">
            <h2>Goal and activity</h2>
            <p>These fields help shape portions and the weekly nutrition pattern.</p>
          </div>
          <div className="complete-profile__grid">
            <label>
              Activity level
              <select value={profile.activityLevel} onChange={(event) => updateProfileField('activityLevel', event.target.value)}>
                <option>Light</option>
                <option>Moderate</option>
                <option>Intense</option>
              </select>
            </label>
            <label>
              Goal
              <select value={profile.goal} onChange={(event) => updateProfileField('goal', event.target.value)}>
                <option>Maintain weight</option>
                <option>Lose weight</option>
                <option>Gain weight</option>
              </select>
            </label>
            <label>
              Diet type
              <select value={profile.dietType} onChange={(event) => updateProfileField('dietType', event.target.value)}>
                {DIET_TYPES.map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
            <label>
              Budget
              <select value={profile.budgetLevel} onChange={(event) => updateProfileField('budgetLevel', event.target.value)}>
                <option>Budget</option>
                <option>Moderate</option>
                <option>Flexible</option>
              </select>
            </label>
          </div>

          <div className="complete-profile__section-heading">
            <h2>Diet and restrictions</h2>
            <p>Allergy handling is best-effort. Always review generated ingredients before shopping or cooking.</p>
          </div>
          <CheckboxGroup
            label="Allergies"
            options={ALLERGY_OPTIONS}
            values={profile.allergies}
            onToggle={(value) => toggleProfileArrayValue('allergies', value)}
          />

          <label>
            Custom allergies
            <input value={profile.customAllergies} onChange={(event) => updateProfileField('customAllergies', event.target.value)} placeholder="Optional" />
          </label>

          <label>
            Foods to avoid
            <input value={profile.foodsToAvoid} onChange={(event) => updateProfileField('foodsToAvoid', event.target.value)} placeholder="e.g. mushrooms, spicy food" />
          </label>

          <CheckboxGroup
            label="Preferred cuisines"
            options={CUISINE_OPTIONS}
            values={profile.preferredCuisines}
            onToggle={(value) => toggleProfileArrayValue('preferredCuisines', value)}
          />

          <div className="complete-profile__section-heading">
            <h2>Cooking preferences and targets</h2>
            <p>Optional fields can be left blank if you are unsure.</p>
          </div>
          <div className="complete-profile__grid">
            <label>
              Cooking skill
              <select value={profile.cookingSkill} onChange={(event) => updateProfileField('cookingSkill', event.target.value)}>
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advanced</option>
              </select>
            </label>
            <label>
              Available cooking time
              <select value={profile.cookingTime} onChange={(event) => updateProfileField('cookingTime', event.target.value)}>
                <option>15 minutes</option>
                <option>30 minutes</option>
                <option>45 minutes</option>
                <option>60 minutes</option>
              </select>
            </label>
            <label>
              Meals per day
              <input type="number" min="1" max="6" value={profile.mealsPerDay} onChange={(event) => updateProfileField('mealsPerDay', event.target.value)} />
            </label>
            <label>
              Servings
              <input type="number" min="1" max="8" value={profile.servings} onChange={(event) => updateProfileField('servings', event.target.value)} />
            </label>
            <label>
              Optional target calories
              <input type="number" min="1000" value={profile.targetCalories} onChange={(event) => updateProfileField('targetCalories', event.target.value)} />
            </label>
            <label>
              Optional protein target (g)
              <input type="number" min="0" value={profile.targetProtein} onChange={(event) => updateProfileField('targetProtein', event.target.value)} />
            </label>
          </div>

          <CheckboxGroup
            label="Appliances"
            options={APPLIANCE_OPTIONS}
            values={profile.appliances}
            onToggle={(value) => toggleProfileArrayValue('appliances', value)}
          />

          <button type="submit">Save and Continue</button>
        </form>
      </section>
    </main>
  );
}

function CheckboxGroup({ label, options, values, onToggle }) {
  return (
    <fieldset className="complete-profile__fieldset">
      <legend>{label}</legend>
      <div>
        {options.map((option) => (
          <label key={option}>
            <input type="checkbox" checked={values.includes(option)} onChange={() => onToggle(option)} />
            {option}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default CompleteProfile;
