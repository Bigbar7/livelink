# Recommendation Search Loading Design

## Goal

When a user taps `生成推荐列表`, the app should show a dedicated loading page while `/api/recommendations` is pending. The user should understand that the backend is searching and ranking Agent profiles, not that the UI is frozen.

## Chosen Approach

Use a full-screen recommendation search step between `find` and `matches`.

- Add a `searching` flow step.
- In `findPeople`, set `step` to `searching` before calling `/api/recommendations`.
- On success, populate recommendations and transition to `matches`.
- On failure, restore `find` and show the existing error message.

## Experience

The loading page should match the current dark generation aesthetic but use recommendation-specific copy and process steps.

- Header: `Searching Agents`.
- Main title: `正在搜寻 / 高匹配推荐`.
- Supporting copy: explain that the user's Agent is reading published profiles and preparing reasons.
- Animated orbit: center uses the current user's initial, with small candidate nodes moving around it.
- Progress sweep: indefinite animation, because the API does not expose real progress.
- Process cards:
  1. `拆解需求`: parse who the user wants to meet and what they can offer.
  2. `探测候选 Agent`: scan tags, needs, skills, and published profile data.
  3. `生成推荐理由`: prepare match scores, reasons, and conversation angles.
- Toast: reassure the user that Agent-to-Agent search is happening.

## Data Flow

No API contract changes are needed. The loading page is driven entirely by local React state.

```text
find -> searching -> matches
                 -> find on error
```

## Error Handling

If the recommendations request fails, keep the current behavior of writing the error message to `error`, but move the user back to the `find` step so they can revise the query and retry.

## Testing

Add focused source-level component tests matching the current test style:

- `FlowStep` includes `searching`.
- `findPeople` sets `setStep('searching')` before the recommendations request.
- The loading page contains the recommendation-specific title, A-to-A search copy, process steps, and `aria-live="polite"`.
- CSS includes the new search loading classes and animations.
