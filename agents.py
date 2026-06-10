from dotenv import load_dotenv
load_dotenv()
from langchain.agents import create_openai_tools_agent, AgentExecutor
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_groq import ChatGroq
from langchain_core.output_parsers import StrOutputParser
from tools import web_search, scrape_url


# Update the string to use the current Llama 3.3 production model ID
llm = ChatGroq(
    model="llama-3.1-8b-instant", 
    temperature=0
)

# 2. Add the required Agent Prompts (CLEANED VERSION)
search_prompt = ChatPromptTemplate.from_messages([
    (
        "system", 
        "You are an expert research agent. Analyze the conversation history, then use your web search tool to find accurate, up-to-date information."
    ),
    MessagesPlaceholder(variable_name="messages"),
    MessagesPlaceholder(variable_name="agent_scratchpad"),
])

reader_prompt = ChatPromptTemplate.from_messages([
    (
        "system", 
        "You are an expert document reader. Analyze the conversation history, then use your scrape tool to extract full details from the provided URLs."
    ),
    MessagesPlaceholder(variable_name="messages"),
    MessagesPlaceholder(variable_name="agent_scratchpad"),
])

# 3. Fixed 1st Agent 
def build_search_agent():
    tools = [web_search]
    # Create the underlying logical agent
    agent = create_openai_tools_agent(
        llm=llm,
        tools=tools,
        prompt=search_prompt  # Pass the required prompt here
    )
    # Wrap it in an Executor so it can actually run tools
    return AgentExecutor(agent=agent, tools=tools, verbose=True, handle_parsing_errors=True)

# 4. Fixed 2nd Agent 
def build_reader_agent():
    tools = [scrape_url]
    # Create the underlying logical agent
    agent = create_openai_tools_agent(
        llm=llm,
        tools=tools,
        prompt=reader_prompt  # Pass the required prompt here
    )
    # Wrap it in an Executor so it can actually run tools
    return AgentExecutor(agent=agent, tools=tools, verbose=True, handle_parsing_errors=True)

#writer chain 

writer_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are an expert research writer. Write clear, structured and insightful reports."),
    ("human", """Write a detailed research report on the topic below.

Topic: {topic}

Research Gathered:
{research}

Structure the report as:
- Introduction
- Key Findings (minimum 3 well-explained points)
- Conclusion
- Sources (list all URLs found in the research)

Write the report carefully. Be detailed, factual and professional."""),
])

writer_chain = writer_prompt | llm | StrOutputParser()

#critic_chain 

critic_prompt = ChatPromptTemplate.from_messages([
     ("system", "You are a sharp and constructive research critic. Be honest and specific."),
    ("human", """Review the research report below and evaluate it strictly.

Report:
{report}

Respond in this exact format:

Score: X/10

Strengths:
- ...
- ...

Areas to Improve:
- ...
- ...

One line verdict:
..."""),
])

critic_chain = critic_prompt | llm | StrOutputParser()


#followup_chat_chain

followup_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful AI assistant. You will be provided with a research report. Answer the user's follow-up questions based on the report. If the answer is not in the report, state that clearly."),
    ("human", """Research Report:
{report}

User Question: {question}

Answer:"""),
])

followup_chat_chain = followup_prompt | llm | StrOutputParser()
