import React, { useState, useEffect } from "react";
import { useMachine } from "@xstate/react";
import PouchDB from "pouchdb";
import { Machine } from "xstate";

const storage = new PouchDB("storage");

const promiseMachine = Machine({
    id: "promise",
    initial: "pending",
    states: {
        pending: {
            on: {
                RESOLVE: "resolved",
                REJECT: "rejected"
            }
        },
        resolved: {
            type: "final"
        },
        rejected: {
            type: "final"
        }
    }
});

export default function LoadStateBeforeApp() {
    const [recentState, setRecentState] = useState(false);

    useEffect(() => {
        const loadState = async () => {
            try {
                const state = JSON.parse((await storage.get("state")).state);
                setRecentState(state);
            } catch (e) {
                setRecentState(null);
            }
        };

        loadState();
    }, []);

    return recentState !== false ? <App recentState={recentState} /> : null;
}

function App({ recentState }) {
    const [state, send, service] = useMachine(promiseMachine, {
        state: recentState
    });

    service.subscribe(state => {
        if (state.event.type === "xstate.init") return;

        console.log("SHOULD NOT BE TRIGGERED ON RELOAD");
        
        storage
            .get("state")
            .then(function(doc) {
                return storage.put({
                    _id: "state",
                    state: JSON.stringify(state),
                    _rev: doc._rev
                });
            })
            .catch(function(err) {
                console.log(err);
                storage.put({
                    _id: "state",
                    state: JSON.stringify(state)
                });
            });
    });

    return (
        <div>
            {state.value === "pending" && (
                <>
                    <button onClick={() => send("RESOLVE")}>resolve</button>
                    <button onClick={() => send("REJECT")}>reject</button>
                </>
            )}

            <h1>state: {state.value}</h1>
        </div>
    );
}
