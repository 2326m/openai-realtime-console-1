import { useEffect, useState } from "react";

const functionDescription = `
Call this function when you want to provide the user with a short brain exercise
such as a quick memory or attention challenge.
`;

async function propose_brain_exercise() {
  const exercises = [
    "Memorize these three words for 30 seconds: apple, boat, tree. Then try to recall them in reverse order.",
    "Count backwards from 100 by sevens.",
    "Name as many animals as you can that start with the letter 'B' within one minute.",
  ];

  const exercise = exercises[Math.floor(Math.random() * exercises.length)];
  return { exercise };
}

const sessionUpdate = {
  type: "session.update",
  session: {
    tools: [
      {
        type: "function",
        name: "propose_brain_exercise",
        description: functionDescription,
        parameters: {
          type: "object",
          properties: {},
        },
      },
    ],
    tool_choice: "auto",
  },
};

function ExerciseOutput({ result }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="font-semibold">Brain Exercise:</p>
      <p>{result.exercise}</p>
      <pre className="text-xs bg-gray-100 rounded-md p-2 overflow-x-auto">
        {JSON.stringify(result, null, 2)}
      </pre>
    </div>
  );
}

export default function ToolPanel({
  isSessionActive,
  sendClientEvent,
  events,
}) {
  const [functionAdded, setFunctionAdded] = useState(false);
  const [exerciseResult, setExerciseResult] = useState(null);

  useEffect(() => {
    if (!events || events.length === 0) return;

    const firstEvent = events[events.length - 1];
    if (!functionAdded && firstEvent.type === "session.created") {
      sendClientEvent(sessionUpdate);
      setFunctionAdded(true);
    }

    const mostRecentEvent = events[0];
    if (
      mostRecentEvent.type === "response.done" &&
      mostRecentEvent.response.output
    ) {
      mostRecentEvent.response.output.forEach(async (output) => {
        if (
          output.type === "function_call" &&
          output.name === "propose_brain_exercise"
        ) {
          const result = await propose_brain_exercise();
          setExerciseResult(result);
          setTimeout(() => {
            sendClientEvent({
              type: "response.create",
              response: {
                instructions: `share the exercise with the user and encourage them to try it.`,
              },
            });
          }, 500);
        }
      });
    }
  }, [events]);

  useEffect(() => {
    if (!isSessionActive) {
      setFunctionAdded(false);
      setExerciseResult(null);
    }
  }, [isSessionActive]);

  return (
    <section className="h-full w-full flex flex-col gap-4">
      <div className="h-full bg-gray-50 rounded-md p-4">
        <h2 className="text-lg font-bold">Brain Exercise Tool</h2>
        {isSessionActive ? (
          exerciseResult ? (
            <ExerciseOutput result={exerciseResult} />
          ) : (
            <p>Ask for a short brain exercise...</p>
          )
        ) : (
          <p>Start the session to use this tool...</p>
        )}
      </div>
    </section>
  );
}
