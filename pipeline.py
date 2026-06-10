from agents import build_reader_agent , build_search_agent , writer_chain , critic_chain
import asyncio
import json

def run_research_pipeline(topic : str) -> dict:
    state = {}

    #search agent working 
    print("\n"+" ="*50)
    print("step 1 - search agent is working ...")
    print("="*50)

    search_agent = build_search_agent()
    search_result = search_agent.invoke({
        "messages" : [("user", f"Find recent, reliable and detailed information about: {topic}")]
    })
    state["search_results"] = search_result['output']

    print("\n search result ",state['search_results'])

    #step 2 - reader agent 
    print("\n"+" ="*50)
    print("step 2 - Reader agent is scraping top resources ...")
    print("="*50)

    reader_agent = build_reader_agent()
    reader_result = reader_agent.invoke({
        "messages": [("user",
            f"Based on the following search results about '{topic}', "
            f"pick the most relevant URL and scrape it for deeper content.\n\n"
            f"Search Results:\n{state['search_results'][:800]}"
        )]
    })

    state['scraped_content'] = reader_result['output']

    print("\nscraped content: \n", state['scraped_content'])

    #step 3 - writer chain 

    print("\n"+" ="*50)
    print("step 3 - Writer is drafting the report ...")
    print("="*50)

    research_combined = (
        f"SEARCH RESULTS : \n {state['search_results']} \n\n"
        f"DETAILED SCRAPED CONTENT : \n {state['scraped_content']}"
    )

    state["report"] = writer_chain.invoke({
        "topic" : topic,
        "research" : research_combined
    })

    print("\n Final Report\n",state['report'])

    #critic report 

    print("\n"+" ="*50)
    print("step 4 - critic is reviewing the report ")
    print("="*50)

    state["feedback"] = critic_chain.invoke({
        "report":state['report']
    })

    print("\n critic report \n", state['feedback'])

    return state



if __name__ == "__main__":
    topic = input("\n Enter a research topic : ")
    run_research_pipeline(topic)

async def run_research_pipeline_stream(topic: str):
    state = {}

    # Step 1: Search
    yield json.dumps({"step": "search", "status": "running"}) + "\n"
    search_agent = build_search_agent()
    search_result = await asyncio.to_thread(
        search_agent.invoke, 
        {"messages": [("user", f"Find recent, reliable and detailed information about: {topic}")]}
    )
    state["search_results"] = search_result['output']
    yield json.dumps({"step": "search", "status": "done", "result": state["search_results"]}) + "\n"

    # Step 2: Reader
    yield json.dumps({"step": "reader", "status": "running"}) + "\n"
    reader_agent = build_reader_agent()
    reader_result = await asyncio.to_thread(
        reader_agent.invoke,
        {"messages": [("user",
            f"Based on the following search results about '{topic}', "
            f"pick the most relevant URL and scrape it for deeper content.\n\n"
            f"Search Results:\n{state['search_results'][:800]}"
        )]}
    )
    state['scraped_content'] = reader_result['output']
    yield json.dumps({"step": "reader", "status": "done", "result": state["scraped_content"]}) + "\n"

    # Step 3: Writer
    yield json.dumps({"step": "writer", "status": "running"}) + "\n"
    research_combined = (
        f"SEARCH RESULTS : \n {state['search_results']} \n\n"
        f"DETAILED SCRAPED CONTENT : \n {state['scraped_content']}"
    )
    state["report"] = await asyncio.to_thread(
        writer_chain.invoke,
        {"topic": topic, "research": research_combined}
    )
    yield json.dumps({"step": "writer", "status": "done", "result": state["report"]}) + "\n"

    # Step 4: Critic
    yield json.dumps({"step": "critic", "status": "running"}) + "\n"
    state["feedback"] = await asyncio.to_thread(
        critic_chain.invoke,
        {"report": state['report']}
    )
    yield json.dumps({"step": "critic", "status": "done", "result": state["feedback"]}) + "\n"

