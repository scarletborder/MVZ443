import streamlit as st
import pandas as pd
import toml
import os

# Constants
CONFIG_PATH = "config.toml"
MATERIALS_PATH = "materials.csv"

# Cached loaders for config and types
@st.cache_data
def load_config(path):
    if not os.path.exists(path):
        return {"pids": {}, "types": {}}
    return toml.load(path)

@st.cache_data
def get_pid_list(config):
    pids = sorted(config.get("pids", {}).items(), key=lambda x: int(x[0]))
    return [(int(k), v) for k, v in pids]

@st.cache_data
def get_type_map(config):
    return {int(k): v for k, v in config.get("types", {}).items()}

# Load config
config = load_config(CONFIG_PATH)

# Initialize materials DataFrame in session state
if "materials" not in st.session_state:
    if os.path.exists(MATERIALS_PATH):
        st.session_state.materials = pd.read_csv(
            MATERIALS_PATH,
            dtype={"pid": int, "level": int, "type": int, "count": int}
        )
    else:
        st.session_state.materials = pd.DataFrame(
            columns=["pid", "level", "type", "count"]
        ).astype({"pid": int, "level": int, "type": int, "count": int})

materials = st.session_state.materials

# Sidebar: PID list and controls
st.sidebar.title("项目管理")
pid_list = get_pid_list(config)
pid_keys = [f"{pid}-{name}" for pid, name in pid_list]
current = st.sidebar.selectbox("选择项目 (PID-名称)", options=pid_keys)
current_pid = int(current.split("-")[0]) if current else None

# Add new PID
with st.sidebar.expander("新增项目"):
    new_pid = st.number_input("PID", value=0, step=1, format="%d", key="new_pid")
    new_name = st.text_input("项目名称", key="new_name")
    if st.button("添加项目"):
        if new_pid in config.get("pids", {}):
            st.error(f"PID {new_pid} 已存在。")
        else:
            config.setdefault("pids", {})[new_pid] = new_name
            with open(CONFIG_PATH, "w", encoding="utf-8") as f:
                toml.dump(config, f)
            st.success(f"已添加 PID {new_pid}-{new_name}")
            st.rerun()

# Main pane: materials editing
st.title("材料需求编辑")
if current_pid is not None:
    type_map = get_type_map(config)
    df_pid = materials[materials["pid"] == current_pid].copy()
    df_pid = df_pid.sort_values(["level", "type"])

    levels = sorted(df_pid["level"].unique())
    for lvl in levels:
        st.subheader(f"等级 {lvl} 材料需求")
        df_lvl = df_pid[df_pid["level"] == lvl]
        # Header row
        c0, c1, c2 = st.columns((2, 2, 1))
        c0.write("类型")
        c1.write("数量")
        c2.write("操作")
        for idx, row in df_lvl.iterrows():
            tname = type_map.get(row["type"], str(row["type"]))
            c0, c1, c2 = st.columns((2, 2, 1))
            c0.write(tname)
            new_count = c1.number_input(
                f"count_{idx}", min_value=0, value=int(row["count"]), key=f"cnt_{idx}"
            )
            if new_count != row["count"]:
                materials.at[idx, "count"] = new_count
            if c2.button("❌", key=f"del_{idx}"):
                materials.drop(idx, inplace=True)
                st.rerun()

        # Add new material in this level
        with st.expander(f"在等级 {lvl} 增加材料"):
            new_type = st.selectbox(
                f"材料类型_{lvl}",
                options=list(type_map.items()),
                format_func=lambda x: f"{x[0]}-{x[1]}",
                key=f"newt_{lvl}"
            )
            new_cnt = st.number_input(
                f"新增数量_{lvl}", min_value=1, value=1, key=f"newc_{lvl}"
            )
            if st.button(f"添加材料_{lvl}"):
                materials.loc[len(materials)] = {
                    "pid": current_pid,
                    "level": lvl,
                    "type": new_type[0],
                    "count": new_cnt,
                }
                st.rerun()

    # Add a completely new level
    with st.expander("增加新等级需求"):
        add_lvl = st.number_input("等级", min_value=1, value=1, step=1, key="add_lvl")
        add_t = st.selectbox(
            "材料类型",
            options=list(type_map.items()),
            format_func=lambda x: f"{x[0]}-{x[1]}",
            key="add_t"
        )
        add_c = st.number_input("数量", min_value=1, value=1, key="add_c")
        if st.button("添加等级材料"):
            materials.loc[len(materials)] = {
                "pid": current_pid,
                "level": add_lvl,
                "type": add_t[0],
                "count": add_c,
            }
            st.rerun()

else:
    st.info("请在左侧选择或新增一个项目 (PID)。")

# Save data button
if st.button("保存 数据"):
    materials.to_csv(MATERIALS_PATH, index=False)
    st.success("已保存 materials.csv")
